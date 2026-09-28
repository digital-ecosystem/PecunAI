/**
 * Durable, PII-safe error log for API routes.
 *
 * Why this exists: `console.error` goes to the container's stdout, which is
 * discarded the moment the container is recreated. A 500 on
 * /api/user/update on 2026-09-25 cost a customer their whole session, and by
 * the time we looked the logs were gone with the next rebuild. This writes to
 * a bind-mounted file on the host instead, so a failure is still readable
 * after a deploy.
 *
 * PII rule: this file must never record field VALUES. The payloads that reach
 * these routes carry names, addresses, birth dates, ID numbers and IBANs.
 * We log field names, types and presence only. The one place raw text is
 * allowed through is an error message, and PrismaClientValidationError — the
 * one error that embeds the full argument object — is filtered down to the
 * argument names it mentions.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const LOG_DIR = process.env.LOG_DIR ?? "/app/logs";
const LOG_FILE = join(LOG_DIR, "app-errors.log");

let dirReady = false;
function ensureDir(): boolean {
  if (dirReady) return true;
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    dirReady = true;
  } catch {
    return false;   // read-only mount, missing dir — never break the request
  }
  return true;
}

/**
 * Describe the shape of a request body without revealing any of it:
 * `{ firstName: "string", isSelfEmployed: "undefined", iban: "empty-string" }`.
 * This is what tells us which field a Prisma validation error is about.
 */
export function fieldShape(
  body: unknown,
  fields: readonly string[],
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!body || typeof body !== "object") return out;
  const b = body as Record<string, unknown>;
  for (const f of fields) {
    const v = b[f];
    out[f] =
      v === undefined ? "undefined"
      : v === null ? "null"
      : v === "" ? "empty-string"
      : Array.isArray(v) ? `array[${v.length}]`
      : typeof v;
  }
  return out;
}

type ErrorDetail = {
  name: string;
  code?: string;
  meta?: unknown;
  message?: string;
  /** Argument names pulled out of a Prisma validation error. */
  invalidArgs?: string[];
  stack?: string;
};

function describeError(error: unknown): ErrorDetail {
  if (!(error instanceof Error)) {
    return { name: typeof error, message: String(error).slice(0, 300) };
  }

  const withCode = error as Error & { code?: string; meta?: unknown };
  const detail: ErrorDetail = { name: error.name };
  if (withCode.code) detail.code = withCode.code;
  if (withCode.meta) detail.meta = withCode.meta;

  if (error.name === "PrismaClientValidationError") {
    // This message embeds the whole argument object, IBAN and all. Take only
    // the backticked identifiers it names — those are column names, not data.
    const args = new Set<string>();
    for (const re of [
      /Argument `([^`]+)` is missing/g,
      /Unknown argument `([^`]+)`/g,
      /Unknown arg `([^`]+)`/g,
    ]) {
      for (const m of error.message.matchAll(re)) args.add(m[1]);
    }
    detail.invalidArgs = [...args];
    if (args.size === 0) {
      // Nothing matched — keep the first line only, which is the invocation
      // header ("Invalid `prisma.personalInfo.upsert()` invocation"), not data.
      detail.message = error.message.split("\n")[0].slice(0, 200);
    }
  } else {
    detail.message = error.message.slice(0, 500);
  }

  // `Error.stack` starts with the message, so for a validation error it
  // repeats the entire argument object. Keep the call frames only — those are
  // file paths and line numbers, never customer data.
  if (error.stack) {
    const frames = error.stack
      .split("\n")
      .filter((l) => /^\s+at\s/.test(l))
      .slice(0, 5);
    if (frames.length > 0) detail.stack = frames.join("\n");
  }
  return detail;
}

/**
 * Append one JSON line describing a route failure. Never throws — a logging
 * problem must not turn into a second failure inside a catch block.
 */
export function logRouteError(
  route: string,
  error: unknown,
  context: Record<string, unknown> = {},
): void {
  const record = {
    ts: new Date().toISOString(),
    level: "error",
    route,
    ...context,
    error: describeError(error),
  };

  const line = JSON.stringify(record);
  console.error(line);            // still goes to `docker logs`

  try {
    if (ensureDir()) appendFileSync(LOG_FILE, line + "\n", "utf8");
  } catch {
    // Disk full, permissions, read-only mount — the console line above stands.
  }
}
