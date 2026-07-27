import { NextRequest, NextResponse } from "next/server";
import { searchPhase5Local } from "@/lib/phase5LocalSearch";

// Sentinel vectorStoreId used only for Phase 5 until its contract-document knowledge base can
// be uploaded to a real OpenAI vector store — see
// private-documents/phase-5-contract-document/PHASE_5_LOCAL_KNOWLEDGE_PLAN.md.
const PHASE5_LOCAL_SENTINEL = "local:phase5-contracts";

const NO_RESULTS = "No relevant content found.";

function isEmpty(results: string): boolean {
  return !results || results.trim() === "" || results === NO_RESULTS;
}

async function searchVectorStore(query: string, vectorStoreId: string): Promise<string> {
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
    throw new Error("Vector store search failed");
  }

  const data = await res.json() as {
    data: Array<{ content: Array<{ type: string; text: string }> }>;
  };

  return (data.data ?? [])
    .flatMap(chunk => chunk.content ?? [])
    .filter(c => c.type === "text" && c.text)
    .map(c => c.text)
    .join("\n\n---\n\n");
}

export async function POST(req: NextRequest) {
  try {
    const { query, vectorStoreId, secondaryVectorStoreId } = await req.json() as {
      query: string; vectorStoreId: string; secondaryVectorStoreId?: string | null;
    };

    if (!query || !vectorStoreId) {
      return NextResponse.json({ error: "query and vectorStoreId required" }, { status: 400 });
    }

    if (vectorStoreId === PHASE5_LOCAL_SENTINEL) {
      // Phase 5 searches BOTH its local contract docs and the shared FAQ store: the contract docs
      // are the only source for the 8 contract PDFs, but the FAQ documents are the only source for
      // the plain-language answers about Rücktrittsrecht, Datenschutz, Einlagensicherung and the
      // like — and routing Phase 5 to this sentinel had cut it off from them entirely.
      // See private-documents/after-demo/PHASE_5_CONSENT_KNOWLEDGE_PLAN.md.
      // A failure in either source is survivable; only both failing is an error.
      const [contracts, faq] = await Promise.all([
        searchPhase5Local(query).catch(err => {
          console.error("[documents/search] phase5 local search failed:", err);
          return "";
        }),
        secondaryVectorStoreId
          ? searchVectorStore(query, secondaryVectorStoreId).catch(err => {
              console.error("[documents/search] phase5 shared-store search failed:", err);
              return "";
            })
          : Promise.resolve(""),
      ]);

      const sections: string[] = [];
      if (!isEmpty(contracts)) sections.push(`AUS DEN VERTRAGSDOKUMENTEN:\n\n${contracts}`);
      if (!isEmpty(faq))       sections.push(`AUS DER ALLGEMEINEN WISSENSDATENBANK:\n\n${faq}`);

      return NextResponse.json({ results: sections.join("\n\n---\n\n") || NO_RESULTS });
    }

    const results = await searchVectorStore(query, vectorStoreId);
    return NextResponse.json({ results: results || NO_RESULTS });
  } catch (err) {
    console.error("[documents/search] error:", err);
    const status = err instanceof Error && err.message === "Vector store search failed" ? 502 : 500;
    return NextResponse.json({ error: status === 502 ? "Vector store search failed" : "Internal error" }, { status });
  }
}
