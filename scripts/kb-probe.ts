/**
 * Knowledge-base regression probe.
 *
 *   set -a; . ./.env; set +a; npx tsx --tsconfig tsconfig.json scripts/kb-probe.ts
 *
 * Asks the local contract index a list of real customer questions and asserts that the retrieved
 * text contains the phrases that actually answer them. Exits non-zero if any case fails, so it
 * can gate a document edit.
 *
 * ── Why this exists ──────────────────────────────────────────────────────────────────────────
 * Three client complaints in a row came down to the AI failing to answer a question whose answer
 * was, or should have been, in these documents. Eyeballing a document after editing it does not
 * catch that: on 2026-08-21 the missing froots custody section was restored, read correctly, and
 * STILL never reached the model — it ranked 10th of 140 chunks, above MIN_SCORE but below TOP_K.
 * Only measuring showed it. Rewording the heading as the customer's actual question moved it to
 * rank 1. That is the recurring lesson: a section has to be phrased the way customers ask, not
 * the way a compliance document states, and the only way to know is to run the query.
 *
 * ── What it does and does NOT cover ──────────────────────────────────────────────────────────
 * It covers the LOCAL index only — the files in phase5LocalSearch.ts's DOC_FILES, read from
 * /vector-store. Those are the contract and company documents, searched as the primary source by
 * terms1, terms2, sustainabilityTerms, phase5 and phase6.
 *
 * It does NOT cover the FAQ documents. Those live only in the OpenAI vector store, reached as the
 * secondary source, and changes to them take effect only after
 * vector-store/upload-to-vector-store.mjs runs. A fix to a FAQ file cannot be verified here — do
 * not read a green run as proof that one landed. (This caught me out once already.)
 *
 * ── Adding a case ────────────────────────────────────────────────────────────────────────────
 * When a complaint arrives, add the customer's question verbatim plus a phrase from the answer
 * that should come back. Keep the wording the customer used, not a tidied-up version — the point
 * is to test the query that actually failed. Costs a few cents in embeddings per run.
 */
import { searchPhase5Local } from "@/lib/phase5LocalSearch";

interface Case {
  /** Where the question came from, so a failure is traceable. */
  origin: string;
  /** The customer's wording, verbatim. */
  question: string;
  /** Phrases that must appear in the retrieved text. Empty + expectNone = must return nothing. */
  expect: string[];
  /** True for off-topic controls: retrieval must return nothing rather than the nearest chunk. */
  expectNone?: boolean;
  /**
   * Phrases that must NOT appear. For facts the client has ruled out saying — retrieval feeding
   * the model a sentence it shouldn't repeat is how it ends up repeating it. Added 2026-08-22
   * after the AI told a customer the depot would close "am Bankarbeitstag nach Eingang": true to
   * the contract, but a duration 4money cannot guarantee.
   */
  forbid?: string[];
}

const CASES: Case[] = [
  {
    origin: "client 2026-08-19, session ea7e7cc8 (Knopper) — asked twice, answered about the wrong company",
    question: "Kann der Vermögensverwalter einfach mit meinem Geld verschwinden?",
    expect: ["Verfügungsgewalt", "Schelhammer"],
  },
  {
    origin: "client 2026-08-16, session 31b98ad5 (Binder) — four consecutive refusals",
    question: "Angenommen, ich will diesen Vertrag nach fünf Jahren beenden, habe ich dann Kosten?",
    expect: ["Kündigung"],
  },
  {
    origin: "client 2026-08-16, session 31b98ad5 (Binder)",
    question: "Kann ich den Vertrag nach fünf Jahren beenden?",
    expect: ["Kündigung"],
  },
  {
    origin: "AI quoted 0,925 % from the form while the Phase 4 screen showed 1,11 % — same fee, no document said so",
    question: "Warum steht im Formular 0,925 Prozent und in der Kostenübersicht 1,11 Prozent?",
    expect: ["1,20"],
  },
  {
    origin: "client 2026-08-21, session 5c54c9e0 (Bracic test case) — AI deflected to 'prüfen Sie die jeweiligen Vertragsdokumente'",
    question: "Kann ich alle Verträge nach fünf Jahren beenden?",
    expect: ["keine feste Laufzeit", "25"],
    // client 2026-08-22: must not state how long closing takes — cannot be guaranteed.
    forbid: ["Bankarbeitstag", "wirksam am", "nach Eingang"],
  },
  {
    origin: "client 2026-08-21, same session — the question that led into it",
    question: "Angenommen, ich will das Produkt nach vier oder fünf Jahren nicht mehr nutzen, geht das so einfach?",
    expect: ["jederzeit"],
    forbid: ["Bankarbeitstag", "wirksam am", "nach Eingang"],
  },
  {
    origin: "client 2026-08-26, session fb8c94c4 (Spreitzer) — AI said 'bis zu 5 %' then 'rund 3 %' two messages apart",
    question: "Welche einmaligen Kosten fallen an für die Eröffnung des Depots?",
    expect: ["individuell vereinbart"],
  },
  {
    origin: "client 2026-08-29, session 5159bd76 (Bocsan) — asked 4x, AI said 'kein Mindestbetrag angegeben' every time; 1.500 existed only as Q18.minValue in the DB, nowhere in the docs",
    question: "Was ist der Mindestbetrag für den Einmalerlag?",
    expect: ["1.500"],
  },
  {
    origin: "client 2026-08-29, same session — the distinction that matters: later top-ups have NO minimum",
    question: "Was ist der Mindestbetrag für die Einmalzahlung, die ich in Zukunft vielleicht tätigen will?",
    expect: ["Zuzahlungen"],
  },
  {
    origin: "control — MIN_SCORE must still reject off-topic questions rather than answering from the nearest chunk",
    question: "Wie wird das Wetter morgen in Wien?",
    expect: [],
    expectNone: true,
  },
];

const NO_RESULTS = "No relevant content found.";

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set. Run with:  set -a; . ./.env; set +a; npx tsx --tsconfig tsconfig.json scripts/kb-probe.ts");
    process.exit(2);
  }

  let failed = 0;
  for (const c of CASES) {
    let results: string;
    try {
      results = await searchPhase5Local(c.question);
    } catch (err) {
      console.log(`✗ ${c.question}\n    search threw: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
      continue;
    }
    const none = results === NO_RESULTS;

    if (c.expectNone) {
      if (none) {
        console.log(`✓ ${c.question}\n    correctly returned nothing`);
      } else {
        console.log(`✗ ${c.question}\n    expected NO results, got: ${firstHeading(results)}\n    origin: ${c.origin}`);
        failed++;
      }
      continue;
    }

    const missing = c.expect.filter(e => !results.includes(e));
    const present = (c.forbid ?? []).filter(f => results.includes(f));
    if (!none && missing.length === 0 && present.length === 0) {
      console.log(`✓ ${c.question}\n    -> ${firstHeading(results)}`);
    } else {
      console.log(`✗ ${c.question}`);
      console.log(`    -> ${none ? "NO RESULTS" : firstHeading(results)}`);
      if (missing.length) console.log(`    missing: ${missing.join(", ")}`);
      if (present.length) console.log(`    MUST NOT be retrievable, but is: ${present.join(", ")}`);
      if (none) console.log(`    nothing retrieved at all`);
      console.log(`    origin: ${c.origin}`);
      failed++;
    }
  }

  console.log(`\n${CASES.length - failed}/${CASES.length} passed`);
  if (failed > 0) {
    console.log(
      "\nA failing case usually means the answering section is phrased as a policy statement " +
      "rather than as the question a customer asks. Rewording its heading to contain the " +
      "question is what fixed this before — see the header comment.",
    );
    process.exit(1);
  }
}

function firstHeading(results: string): string {
  return results.split("\n")[0].replace(/^#+\s*/, "").slice(0, 70);
}

main();
