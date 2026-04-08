import { createServer } from "http";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";

const dev  = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT ?? "4001", 10);

const app    = next({ dev, port });
const handle = app.getRequestHandler();

const OPENAI_REALTIME_URL =
  "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview";

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  // Next.js internal upgrade handler (handles HMR WebSocket in dev)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nextUpgrade = (app as any).getUpgradeHandler?.() ?? null;

  // ── WebSocket server (no HTTP server attached — we handle upgrades manually)
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const { pathname } = new URL(req.url ?? "/", `http://localhost:${port}`);

    if (pathname === "/api/realtime/proxy") {
      wss.handleUpgrade(req, socket, head, (client) => {
        wss.emit("connection", client, req);
      });
    } else if (nextUpgrade) {
      nextUpgrade(req, socket, head);
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (client) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("[proxy] OPENAI_API_KEY is not set");
      client.close(1011, "Server misconfigured");
      return;
    }

    console.log("[proxy] Browser connected — opening upstream to OpenAI");

    const upstream = new WebSocket(OPENAI_REALTIME_URL, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "OpenAI-Beta": "realtime=v1",
      },
    });

    // Buffer messages from browser until upstream is ready
    const queue: { data: import("ws").RawData; isBinary: boolean }[] = [];

    // OpenAI → browser (preserve text/binary frame type)
    upstream.on("message", (data, isBinary) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data, { binary: isBinary });
      }
    });

    // Browser → OpenAI (queue if upstream not yet open; preserve text/binary frame type)
    client.on("message", (data, isBinary) => {
      if (upstream.readyState === WebSocket.OPEN) {
        upstream.send(data, { binary: isBinary });
      } else {
        queue.push({ data, isBinary });
      }
    });

    upstream.on("open", () => {
      console.log("[proxy] Upstream connection to OpenAI open");
      // Flush any messages the browser sent before upstream was ready
      for (const { data, isBinary } of queue) upstream.send(data, { binary: isBinary });
      queue.length = 0;
    });

    upstream.on("close", (code, reason) => {
      console.log("[proxy] Upstream closed", code, reason.toString());
      if (client.readyState === WebSocket.OPEN) client.close();
    });

    client.on("close", (code) => {
      console.log("[proxy] Browser disconnected", code);
      if (upstream.readyState === WebSocket.OPEN) upstream.close();
    });

    upstream.on("error", (err) => {
      console.error("[proxy] Upstream error:", err.message);
      if (client.readyState === WebSocket.OPEN) client.close(1011, "Upstream error");
    });

    client.on("error", (err) => {
      console.error("[proxy] Client error:", err.message);
      if (upstream.readyState === WebSocket.OPEN) upstream.close();
    });
  });

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
