// OpenAI Realtime API function tool definitions.
// These are sent in session.update and response.create calls.

export const SEARCH_DOCUMENT_TOOL = {
  type: "function" as const,
  name: "search_document",
  description: "Search the knowledge base documents to answer the customer's question accurately. Always call this first before answering any question about the documents.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "The customer's question or topic to search for" },
    },
    required: ["query"],
  },
};

export const TOOLS = [
  {
    type: "function",
    name: "explain_topic",
    description: "Opens a visual explanation overlay on screen. Call this BEFORE speaking whenever the customer asks about a concept or wants more information. The overlay shows title + bullet-point key highlights; speak the full explanation verbally at the same time.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Concise topic title displayed as the overlay heading (e.g. 'Stocks & Bonds')",
        },
        keyPoints: {
          type: "array",
          items: { type: "string" },
          description: "3–5 short bullet-point highlights. Visual prompts only — do NOT put the full explanation here; speak it verbally.",
        },
        stats: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              value: { type: "number", description: "Percentage 0–100" },
              color: { type: "string", description: "CSS color string (e.g. 'rgba(59,130,246,0.8)')" },
            },
            required: ["label", "value", "color"],
          },
          description: "Optional data bars — include only when concrete percentages add value (e.g. asset allocation).",
        },
      },
      required: ["title", "keyPoints"],
    },
  },
  {
    type: "function",
    name: "close_explanation",
    description: "Closes the explanation overlay and returns to the main voice session. Call this after the customer confirms they understood the explanation and want to continue.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "highlight_answer",
    description: "Shows a proposed answer visually on screen. Use ONLY when you are genuinely unsure which option the customer meant — their phrasing was vague or ambiguous. Do NOT call this for every answer — most of the time you should call submit_answer directly. After calling this, ask once to clarify (e.g. 'Did you mean X?'), then submit whichever they confirm.",
    parameters: {
      type: "object",
      properties: {
        questionId: { type: "string", description: "ID of the current question" },
        value:      { type: "string", description: "The answer value (option value, number string, or free text)" },
        label:      { type: "string", description: "Human-readable label to read back to the customer" },
      },
      required: ["questionId", "value", "label"],
    },
  },
  {
    type: "function",
    name: "submit_answer",
    description: "Saves the customer's answer to the database. Call this as soon as you clearly understand the customer's answer — no highlight_answer confirmation needed for clear answers. Always call this before moving to the next topic.",
    parameters: {
      type: "object",
      properties: {
        questionId: { type: "string", description: "ID der beantworteten Frage" },
        value:      { type: "string", description: "Antwortwert" },
      },
      required: ["questionId", "value"],
    },
  },
  {
    type: "function",
    name: "navigate",
    description: "Moves the on-screen question carousel. Call this IMMEDIATELY when the customer wants to navigate — BEFORE speaking your response. Two modes: (1) Customer references a SPECIFIC topic by name/description and you can identify its ID from the topics list — pass questionId to jump directly to it. (2) Customer says 'skip'/'next' or 'go back' without specifying a topic — use direction 'next' or 'prev'. questionId takes priority over direction when both are provided.",
    parameters: {
      type: "object",
      properties: {
        direction: {
          type: "string",
          enum: ["next", "prev"],
          description: "Use for generic skip (next) or one-step back (prev). Omit when providing questionId.",
        },
        questionId: {
          type: "string",
          description: "Exact ID of the question to jump to. Use when customer references a specific topic you can identify from the topics list above.",
        },
      },
    },
  },
  {
    type: "function",
    name: "confirm_product",
    description: "Call when: (1) the customer is done reviewing Phase 1 answers and wants to see the product recommendation, or (2) the customer explicitly confirms they want to proceed with the recommended portfolio shown in Phase 2.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "revisit_questions",
    description: "Call when the customer explicitly wants to go back and change their Phase 1 answers.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "navigate_back",
    description: "Call when the customer explicitly asks to go BACK to the previous step/screen (e.g. 'go back', 'take me back a step', 'I want to change the previous section'). Moves exactly one phase backward and keeps all their data. Do NOT use this for moving between Phase 1 questions (use navigate) or for going from the product screen back to the Phase 1 questions (use revisit_questions).",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "confirm_investment",
    description: "Call when the customer explicitly confirms the investment costs and terms shown in Phase 4 (Investment Form) and wants to proceed to the contract documents. Only call this after the customer has verbally agreed — do not call it just because they asked a question about the costs.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "confirm_contracts",
    description: "Call when the customer explicitly confirms they've reviewed and agree to the contract documents shown in Phase 5 and wants to proceed. Only call this after the customer has verbally agreed — do not call it just because they asked a question about a document. This moves to a final open Q&A, not directly to signing.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "confirm_ready_to_sign",
    description: "Call when the customer explicitly says they have no more questions and are ready to proceed to signing the documents. Only call this after the customer clearly indicates they're done — do not call it just because they asked and got an answer to one question.",
    parameters: { type: "object", properties: {} },
  },
  {
    type: "function",
    name: "set_language",
    description: "Call this immediately when the customer explicitly asks to switch the conversation language. Supported values: 'de' (German) or 'en' (English). After calling this, continue speaking in the new language.",
    parameters: {
      type: "object",
      properties: {
        language: { type: "string", enum: ["de", "en"], description: "Target language code" },
      },
      required: ["language"],
    },
  },
];
