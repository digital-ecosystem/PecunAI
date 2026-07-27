import { readFile } from "fs/promises";
import path from "path";

// Temporary local stand-in for a real OpenAI vector store, used only for Phase 5's contract
// documents until they can be uploaded there. See
// private-documents/phase-5-contract-document/PHASE_5_LOCAL_KNOWLEDGE_PLAN.md.
const DOC_FILES = [
  "Deckblatt Vertragspaket.md",
  "Vermittlungsgebühr.md",
  "Servicegebühr.md",
  "Serviceentgelt.md",
  "Vermögensverwaltungsvertrag.md",
  "4money Protokoll Digital Onboarding Guide.md",
  "Froots Allgemeine Informationsbroschüren.md",
  "Depoteröffnungsantrag.md",
];

const VEKTORDATENBANK_DIR = path.join(process.cwd(), "Vektordatenbank");
const EMBEDDING_MODEL      = "text-embedding-3-small";
const CHUNK_MAX_CHARS      = 1500;
const TOP_K                = 3;
// TOP_K already picks the best 3 chunks whatever this is set to, so MIN_SCORE's only real job is
// deciding when to return NOTHING — i.e. when to let the AI say "that isn't in these documents"
// instead of answering from the closest available passage. At the original 0.3 it almost never
// fired (40–93 of 98 chunks cleared it on a typical query), which is how off-topic questions got
// confident answers built on unrelated contract text.
//
// Measured over this corpus (98 chunks, text-embedding-3-small), top-1 score by question type:
//                          German query      English query
//   in scope               0.515 – 0.751     0.382 – 0.622
//   out of scope           0.207 – 0.486     0.079 – 0.319   (+ one outlier at 0.611 / 0.463)
//
// The documents are German, and cross-language similarity runs ~0.13 lower, so the threshold has
// to clear the ENGLISH in-scope floor (0.382), not the German one — the session language is
// customer-selectable. 0.45 looked right on German questions alone and would have wrongly
// rejected 6 of 12 real English ones.
//
// At 0.35: zero false negatives in either language, and 7/10 (German) / 9/10 (English) of the
// out-of-scope questions correctly rejected — against 5/10 and 7/10 at the original 0.3.
// Anything higher trades English recall for one extra German rejection. Not worth it.
//
// The outlier ("Wie alt ist der Vorstand von 4money?") is unreachable by any threshold that keeps
// the real questions — it is genuinely close to the corpus. The answer instructions already tell
// the model to say when the retrieved text doesn't cover the question.
const MIN_SCORE            = 0.35;

interface Chunk {
  file:      string;
  text:      string;
  embedding: number[];
}

// Cached in module scope — computed once per server process, reused across every request.
let chunksPromise: Promise<Chunk[]> | null = null;

function chunkMarkdown(text: string): string[] {
  // Split on level-2 headings first (mirrors how the source docs are structured); any section
  // still too long gets further split by paragraph, grouped back up to roughly CHUNK_MAX_CHARS.
  const sections = text.split(/\n(?=##\s)/);
  const chunks: string[] = [];
  for (const section of sections) {
    if (section.length <= CHUNK_MAX_CHARS) {
      chunks.push(section.trim());
      continue;
    }
    const paragraphs = section.split(/\n\n+/);
    let current = "";
    for (const p of paragraphs) {
      if (current && (current.length + p.length + 2) > CHUNK_MAX_CHARS) {
        chunks.push(current.trim());
        current = p;
      } else {
        current = current ? `${current}\n\n${p}` : p;
      }
    }
    if (current.trim()) chunks.push(current.trim());
  }
  return chunks.filter(c => c.length > 0);
}

async function embed(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
  });
  if (!res.ok) {
    throw new Error(`Embeddings API failed: ${await res.text()}`);
  }
  const data = await res.json() as { data: Array<{ embedding: number[] }> };
  return data.data.map(d => d.embedding);
}

async function buildChunks(): Promise<Chunk[]> {
  const rawChunks: { file: string; text: string }[] = [];
  for (const file of DOC_FILES) {
    const content = await readFile(path.join(VEKTORDATENBANK_DIR, file), "utf-8");
    for (const text of chunkMarkdown(content)) {
      rawChunks.push({ file, text });
    }
  }
  const embeddings = await embed(rawChunks.map(c => c.text));
  return rawChunks.map((c, i) => ({ ...c, embedding: embeddings[i] }));
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function searchPhase5Local(query: string): Promise<string> {
  // Cache the built chunks, but never cache a FAILURE: a single transient embeddings error would
  // otherwise leave a rejected promise in module scope and break contract search for the entire
  // life of the server process. Dropping the reference lets the next request rebuild.
  if (!chunksPromise) {
    chunksPromise = buildChunks().catch(err => {
      chunksPromise = null;
      throw err;
    });
  }
  const chunks = await chunksPromise;

  const [queryEmbedding] = await embed([query]);
  const top = chunks
    .map(c => ({ text: c.text, score: cosineSimilarity(c.embedding, queryEmbedding) }))
    .sort((a, b) => b.score - a.score)
    .filter(c => c.score >= MIN_SCORE)
    .slice(0, TOP_K);

  if (top.length === 0) return "No relevant content found.";
  return top.map(c => c.text).join("\n\n---\n\n");
}
