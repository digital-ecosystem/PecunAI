import type { CarouselQuestion } from "@/components/voice/VoiceCarousel";
import { useVoiceSessionStore } from "@/store/voiceSessionStore";
import type { ComplianceStop, PendingComplianceStop } from "./types";
import type { VoiceContext } from "./voiceContext";
import {
  ASSET_CLASS_OVERLAY,
  BLOCKER_SYSTEM_MSG,
  BLOCKER_Q3_INSTRUCTIONS,
  BLOCKER_Q4_INSTRUCTIONS,
  BLOCKER_Q7_INSTRUCTIONS,
  BLOCKER_ASSET_KNOWLEDGE_INSTRUCTIONS,
} from "./prompts";

/** The asset classes whose "Kenne ich nicht" answer is a two-strike rule. */
export const ASSET_KNOWLEDGE_ORDERS = [12, 13, 14];

export function isAssetKnowledgeQuestion(question: CarouselQuestion): boolean {
  return question.questionOrder !== undefined
    && ASSET_KNOWLEDGE_ORDERS.includes(question.questionOrder);
}

export function evaluateComplianceStop(args: {
  question:            CarouselQuestion;
  value:               string;
  questions:           CarouselQuestion[];
  savedAnswers:        Record<string, string>;
  /** Questions whose explanation has already been shown — the second strike. */
  assetKnowledgeShown: Set<string>;
}): ComplianceStop | null {
  const { question, value, questions, savedAnswers, assetKnowledgeShown } = args;
  const order = question.questionOrder;

  // Q3 — the customer states they did not receive the sustainability information.
  if (order === 3 && value === "no") {
    return { kind: "q3", reason: "q3_sustainability_info_not_received" };
  }

  // Q4 — only "neutral" can be served digitally. "yes" (must be sustainable) and
  // "no" (refuses sustainable entirely) both need a human.
  if (order === 4 && (value === "yes" || value === "no")) {
    return { kind: "q4", reason: "q4_sustainability_preference_unsupported" };
  }

  if (order === 6 || order === 7) {
    const partner    = questions.find(q => q.questionOrder === (order === 6 ? 7 : 6));
    const partnerStr = partner ? savedAnswers[partner.id] : undefined;
    const incomeStr   = order === 6 ? value : partnerStr;
    const expensesStr = order === 7 ? value : partnerStr;

    // Unknown until both are in. The other question's answer will trigger it.
    if (incomeStr !== undefined && expensesStr !== undefined) {
      const income   = parseFloat(incomeStr);
      const expenses = parseFloat(expensesStr);
      if (!isNaN(income) && !isNaN(expenses) && income - expenses <= 150) {
        return { kind: "q7", reason: "q7_insufficient_disposable_income" };
      }
    }
  }

  if (isAssetKnowledgeQuestion(question) && value === "none"
      && assetKnowledgeShown.has(question.id)) {
    return {
      kind:       "assetKnowledge",
      reason:     `q${order}_asset_knowledge_insufficient`,
      assetTitle: ASSET_CLASS_OVERLAY[order!]?.data.title ?? "",
    };
  }

  return null;
}

function blockerInstructions(stop: ComplianceStop, lang: "de" | "en"): string {
  switch (stop.kind) {
    case "q3": return BLOCKER_Q3_INSTRUCTIONS(lang);
    case "q4": return BLOCKER_Q4_INSTRUCTIONS(lang);
    case "q7": return BLOCKER_Q7_INSTRUCTIONS(lang);
    case "assetKnowledge":
      return BLOCKER_ASSET_KNOWLEDGE_INSTRUCTIONS(lang, stop.assetTitle ?? "");
  }
}

export async function performComplianceStop(
  ctx:     VoiceContext,
  pending: PendingComplianceStop,
): Promise<void> {
  const {
    saveAnswer, answeredIdsRef, skippedIdsRef, setSavedAnswers, savedAnswersRef,
    blockSession, pendingPhaseTransitionRef, send, router, langRef,
  } = ctx;
  const { stop, questionId, value } = pending;

  // The advisor picking this up needs to see what was actually answered.
  await saveAnswer(questionId, value);
  answeredIdsRef.current.add(questionId);
  skippedIdsRef.current.delete(questionId);
  setSavedAnswers(prev => ({ ...prev, [questionId]: value }));
  savedAnswersRef.current = { ...savedAnswersRef.current, [questionId]: value };
  useVoiceSessionStore.getState().markAnswered(questionId, value);

  blockSession(stop.reason);
  pendingPhaseTransitionRef.current = () => router.push("/customer/dashboard");
  // Required before the override — see BLOCKER_SYSTEM_MSG's declaration.
  send({
    type: "conversation.item.create",
    item: { type: "message", role: "user", content: [{ type: "input_text", text: BLOCKER_SYSTEM_MSG }] },
  });
  send({
    type: "response.create",
    response: { instructions: blockerInstructions(stop, langRef.current) },
  });
}
