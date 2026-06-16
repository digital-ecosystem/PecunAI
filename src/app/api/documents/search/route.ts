import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { query, vectorStoreId } = await req.json() as { query: string; vectorStoreId: string };

    if (!query || !vectorStoreId) {
      return NextResponse.json({ error: "query and vectorStoreId required" }, { status: 400 });
    }

    const res = await fetch(`https://api.openai.com/v1/vector_stores/${vectorStoreId}/search`, {
      method: "POST",
      headers: {
        Authorization:  `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta":  "assistants=v2",
      },
      body: JSON.stringify({ query, max_num_results: 4 }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[documents/search] OpenAI error:", err);
      return NextResponse.json({ error: "Vector store search failed" }, { status: 502 });
    }

    const data = await res.json() as {
      data: Array<{ content: Array<{ type: string; text: string }> }>;
    };

    const results = (data.data ?? [])
      .flatMap(chunk => chunk.content ?? [])
      .filter(c => c.type === "text" && c.text)
      .map(c => c.text)
      .join("\n\n---\n\n");

    return NextResponse.json({ results: results || "No relevant content found." });
  } catch (err) {
    console.error("[documents/search] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
