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
const MIN_SCORE            = 0.3;

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
  if (!chunksPromise) chunksPromise = buildChunks();
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
