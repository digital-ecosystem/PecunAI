# PecunAI Voice Session – V2 Specification

**Version:** 2.0-draft  
**Date:** 2026-03-10  
**Language scope:** German (UI) / English (technical)  
**Status:** Architecture & Phase-1 Design

---

## 1. Executive Summary

Version 2 replaces the current text-based stepper/chatbot hybrid with a **voice-first onboarding experience** powered by a real-time speech-to-speech AI. PecunAI speaks to the customer, guides them through every step of the onboarding workflow, and listens to answers. The customer can also tap options on-screen – both channels (voice and tap) are fully supported at all times.

The full workflow spans five phases:

| # | Phase | Current v1 | V2 |
|---|-------|-----------|-----|
| 1 | Questions & Risk Profile | Text stepper + question cards | **Voice + tap (Phase 1 of V2 build)** |
| 2 | Product Suggestion | Static card | Voice explanation + tap confirm |
| 3 | AI Chat (deep-dive) | Text chatbot | Voice continuation |
| 4 | Personal Info | Form | Voice-assisted form |
| 5 | Agreement + Signteq | PDF viewer + iFrame | Embedded with voice guidance |

This document covers the **complete V2 architecture** while focusing build effort on **Phase 1 (Questions)** first.

---

## 2. Current Architecture (V1 Baseline)

Understanding what exists is essential before redesigning.

### 2.1 Session Model

A session (`QASession`) is the central record that ties everything together. It moves through a series of phases from the first terms disclosure all the way to the signed document. Along the way it accumulates the customer's answers, their personal identity data, the product that was recommended, the terms they accepted, the AI conversation thread, and the final signed documents. A workflow state object tracks which step the session is currently on and carries any auxiliary data needed by integrations such as SignTeq.

### 2.2 Current Stepper Phases (v1)

The v1 stepper walks the customer through eleven sub-steps in sequence:

1. **Terms 1** – displays 4money company information
2. **Terms Froots** – displays froots customer information
3. **Questions 1** – two initial screening questions
4. **Terms 2** – sustainability risks disclosure
5. **Questions 2** – thirteen detailed risk-profile questions
6. **Suggestions** – AI-matched product recommendation card
7. **Chat** – AI chatbot where the customer can ask questions about the recommended product
8. **Personal Info** – full personal data form with validation
9. **Investment Form** – IBAN and investment details
10. **Contract Document** – document preview
11. **Result PDF** – SignTeq signing iFrame and final download

### 2.3 Question Types

Questions are stored in the database and come in three types. Choice questions present a fixed set of selectable options. Text questions accept free-form input. Range questions accept a numeric value within a defined minimum and maximum. Some questions also carry conditional display logic – they only appear if a prior question was answered in a specific way. Each question belongs to a phase batch (Questions 1 or Questions 2) and can include a footnote for additional context.

### 2.4 Product Matching

After the customer completes all questions, the backend calculates a risk score from the answers and maps it to one of six investment portfolios:

- **Liquidity Plus** – very low risk (SRI 1)
- **Goal** – low risk (SRI 2)
- **Peace of Mind** – low to moderate risk (SRI 2–3)
- **Balance** – moderate risk (SRI 3–4)
- **Future** – moderate to high risk (SRI 4–5)
- **Dream Big** – high risk (SRI 5)

Each portfolio has a dedicated AI prompt document in the knowledge base that PecunAI uses when explaining the product to the customer.

### 2.5 Signing Flow

Once all information is collected, the system generates a PDF investment agreement and sends it to SignTeq. SignTeq returns a URL that is embedded as an iFrame in the application so the customer can sign without leaving the page. When signing is complete, SignTeq fires a webhook that saves the signed document. The session then waits for an admin to review it and change the status to Approved or Rejected.

---

## 3. V2 Voice Architecture

### 3.1 Voice Provider

**Primary choice: OpenAI Realtime API**

OpenAI offers a real-time speech-to-speech API that connects over a persistent WebSocket. The model receives raw audio from the microphone, understands it, and streams synthesised speech back in near real-time. It supports function calling, which allows the AI to signal the application when the customer has answered a question – this is essential for driving the workflow automatically. The recommended voice is `nova`, which has a warm tone that works well for German.

**Fallback: ElevenLabs Conversational AI**

ElevenLabs provides higher emotional quality text-to-speech and a conversational AI SDK. It is more complex to integrate and adds a second vendor dependency. It should be evaluated only if the OpenAI voice quality proves unsatisfactory for German speech after testing.

**Decision guideline:** Start with OpenAI Realtime. It has lower latency, a single API for both input and output, and built-in function calling. Switch to ElevenLabs only if German voice realism is a hard blocker.

### 3.2 High-Level Data Flow

The customer's device maintains two simultaneous connections. A WebSocket connection carries the real-time audio stream to and from OpenAI. A set of standard REST calls over HTTPS communicates with the Next.js backend to load questions, save answers, advance the session phase, and fetch product suggestions. The UI maintains an in-memory state machine that tracks the current question index, the voice state (speaking, listening, muted), and the resume point.

### 3.3 Session State Extensions for V2

The existing workflow state record already accepts a flexible JSON data field. V2 adds a `voice` sub-object to that field that stores: the index of the last question that was presented, the index of the last question that was fully answered, which phase the session was in when it was last active, whether the session has been started at all, and the timestamp when the user muted the AI. This makes resuming a session completely reliable across browser closes and device switches.

---

## 4. V2 UI Design – Mobile First

### 4.1 Screen Layout

The screen is divided into five stacked zones from top to bottom, designed for portrait orientation on a ~390px wide phone:

**Zone 1 – Header (fixed, minimal)**
A slim bar showing a back arrow on the left and the session identifier on the right. Kept intentionally minimal so the functional content gets maximum space.

**Zone 2 – Question Card (~35% of screen height)**
A white card with a soft drop shadow showing the current question text in large, readable type. A progress indicator shows the current question number out of the total (e.g. "Frage 4 von 15") along with a thin horizontal progress bar. If the question has a footnote, it appears as a small info icon that expands on tap.

**Zone 3 – Answer Options**
Full-width tappable tiles stacked vertically. Each tile is at least 56px tall for comfortable thumb-tapping on mobile. Unselected tiles have a light grey background. The selected tile turns a light indigo with an indigo border. When the AI detects a spoken answer, it highlights the matching tile automatically.

**Zone 4 – Voice Wave Strip (64px tall)**
A horizontal waveform visualiser centred on the screen. Below it, a small status label reads "PecunAI spricht" while the AI is talking, or changes to "Bitte antworten Sie" when the AI is listening.

**Zone 5 – Navigation Bar (pinned to bottom)**
Three controls: a mute toggle on the left, a back button in the centre-left, and a forward/confirm button on the right. The forward button is disabled until an answer has been selected or spoken. The bar sits above the iOS/Android safe area so it is never hidden by the home indicator.

### 4.2 Voice Wave Component

The waveform reflects the audio state in real time using different colours and animation styles:

- **Idle (AI silent):** a flat horizontal line with a slow, subtle pulse, coloured grey
- **AI speaking:** animated vertical bars of varying heights driven by the actual audio frequency data, coloured indigo (the brand colour)
- **User speaking / speech recognition active:** similar animated bars coloured green to indicate the user's own voice is being captured
- **Muted:** flat line with a mute icon overlaid; no animation

The visualiser reads live frequency data from the Web Audio API on every animation frame and draws it onto a canvas element. Approximately 32 bars are rendered, each 3px wide with 4px gaps, centred vertically in the 64px strip.

### 4.3 Question Card Behaviour

When the session advances to a new question, the old card slides out to the left and the new card slides in from the right, giving a natural left-to-right reading direction. When going back, the cards slide in the opposite direction. The animation duration is approximately 250ms so it feels responsive without being distracting. The progress bar fills proportionally with each confirmed answer.

### 4.4 Answer Options Behaviour

For choice questions, the options appear as a scrollable list of tiles. The AI reads them aloud in order. If the customer taps one, it is immediately highlighted and the AI acknowledges the selection. If the customer speaks an answer, the speech recognition result is fuzzy-matched against the option values and the closest match is highlighted for the customer to confirm.

For text and numeric questions, a large input field appears instead of tiles. Speech recognition auto-fills the field as the customer speaks. For numeric questions where a minimum and maximum value are defined, a slider is shown alongside the text input.

### 4.5 Navigation Bar

Three controls sit in a fixed bar pinned to the bottom of the screen:

- **Stumm / Laut (Mute toggle)** on the left: silences the AI's voice output while keeping the session alive and tap interaction enabled
- **Zurück** in the centre: navigates to the previous question; the AI re-reads it and restores the previously given answer as highlighted
- **Weiter** on the right: confirms the current answer and advances to the next question; disabled until an answer is selected or spoken

### 4.6 Mute Behaviour

When the customer taps the mute button, the AI's audio output is silenced. The WebSocket connection stays open and the AI continues to process the session internally. The question card and answer tiles remain fully interactive so the customer can continue by tapping. A badge on the mute button reads "Stumm – tippen Sie Ihre Antwort" to remind the customer that tap input still works. Unmuting resumes audio and the AI re-reads the current question to re-orient the customer.

---

## 5. Full V2 Workflow Phases

The session state machine is designed to support all five phases from the start, even though only Phase 1 is built first. Building the state machine correctly in Phase 1 avoids costly refactoring later.

### Phase 1 – Questions & Risk Profile (Build Now)

This phase replaces the existing stepper entirely. The AI guides the customer through the same sequence of terms disclosures and questions that exist in v1, but entirely through voice with tap as a parallel input method:

1. AI reads a concise summary of the 4money company information → customer taps "Verstanden"
2. AI reads a concise summary of the froots customer information → customer taps "Verstanden"
3. AI asks the two Questions 1 items → customer answers by voice or tap
4. AI reads a brief sustainability risks notice → customer taps "Verstanden"
5. AI works through all thirteen Questions 2 items → customer answers by voice or tap

At the end of this phase, all answers are saved to the database, the risk score is calculated, and the session advances to Phase 2.

### Phase 2 – Product Suggestion (Design Reserved)

The AI announces the recommended product by its public name (never the internal VVKN code). It gives a brief verbal explanation of the product's key characteristics, risk profile, and investment horizon, drawing from the product's knowledge-base file. The customer can ask clarifying questions via voice. To proceed, the customer either says a verbal confirmation or taps the Weiter button. If the customer declines the suggestion, the AI offers to revisit the questions.

### Phase 3 – AI Chat / Deep-Dive (Design Reserved)

An open-ended voice conversation where the customer can ask anything about the recommended product, the companies involved, costs, sustainability, or legal context. The AI answers using only the knowledge-base files for that product and the relevant FAQ documents. The customer ends this phase by saying "Ich bin bereit" or tapping Weiter. The transition back to the structured workflow is seamless.

### Phase 4 – Personal Info (Design Reserved)

The AI introduces each group of personal data fields by explaining why that information is required from a regulatory perspective. Fields appear one group at a time: name, then birth details, then address, then contact information. The customer can speak their answers (speech recognition auto-fills each field) or type manually. Before moving on, the AI reads back the entered values for the customer to confirm verbally or by tapping.

### Phase 5 – Agreement + Signing (Design Reserved)

The AI gives a verbal summary of the investment agreement. The full PDF document is shown on screen for the customer to scroll through. The SignTeq signing iFrame is then embedded and the AI guides the customer through the signing steps. Once the document is completed, the AI confirms success, the session status moves to Pending, and an admin is notified for review.

---

## 6. Voice Session State Machine

The voice session moves through a series of named states:

- **Idle** – the session page has loaded but the WebSocket is not yet open
- **Connecting** – the WebSocket handshake with the OpenAI Realtime API is in progress
- **Greeting** – connected; the AI delivers its opening message to the customer
- **Speaking** – the AI is actively reading a question, disclosure, or acknowledgement
- **Listening** – the AI has finished speaking; the microphone is active and speech recognition is running
- **Processing** – an answer has been received (by voice or tap); it is being saved to the backend and the next question is being loaded
- **Muted** – the AI's audio output is off; the customer is expected to interact by tapping
- **Paused** – the browser tab has become inactive; the connection is kept alive where possible or flagged for reconnection when the tab regains focus
- **Resuming** – the session was loaded with a previously saved question index; the AI is greeting the returning customer
- **Error** – the WebSocket connection failed; the session falls back to tap-only mode with a visual notice

### Resume Logic

When a customer returns to an in-progress session, the application loads the saved question index from the workflow state. The AI greets the customer by name and tells them how many questions they have already answered, then asks whether they want to continue from where they left off or start the phase again. If they confirm, the session jumps directly to the next unanswered question. If they decline, the phase restarts from its first step.

---

## 7. AI Instruction Design (Realtime System Prompt)

The AI operates under a system prompt that establishes its identity and rules for the Questions phase. The key rules are:

- It is PecunAI, the same digital onboarding assistant described in the base system prompt document, with the same professional, formal, German-language persona
- It is currently conducting a structured questionnaire and must follow the question order exactly
- After reading each question and its options, it must wait for the customer to answer before proceeding
- It must read out the available options so the customer knows what choices are available
- It may never skip a question, invent an answer, or summarise multiple questions at once
- It always addresses the customer formally with "Sie"
- When the customer speaks an answer, the AI confirms what it heard before accepting it (e.g. "Ich habe verstanden: 1.500 bis 3.000 Euro. Ist das korrekt?")

### Function Calls

The AI uses three defined function calls to interact with the application rather than generating free text that the UI would need to interpret:

**submit_answer** – called when the customer has clearly and confirmably answered the current question. Carries the question identifier, the selected value, and a flag indicating whether the customer explicitly confirmed.

**navigate** – called to move forward to the next question, back to the previous question, or to skip a terms/disclosure screen. The AI calls this itself after a `submit_answer` is processed.

**read_options** – called when the customer asks to hear the options again. The UI can also trigger this externally if the customer taps a "repeat" button.

---

## 8. Tech Stack & New Dependencies (Phase 1)

| Concern | Technology | Notes |
|---------|-----------|-------|
| Realtime voice | OpenAI Realtime API | WebSocket, `gpt-4o-realtime-preview` model |
| Audio capture | Web Audio API | Built into all modern browsers, no package needed |
| Waveform visualiser | Web Audio API AnalyserNode + HTML Canvas | No external library needed |
| Animation | Framer Motion | Likely already in the project |
| Voice state management | React useReducer | Centralised; avoids scattered useState calls |
| Answer persistence | Existing API routes | No changes needed to backend |
| Phase advancement | Existing workflow state API | Minor extension for the voice sub-object |

Two new environment variables are needed: the OpenAI API key scoped for Realtime access, and the model name. No other infrastructure changes are required for Phase 1.

---

## 9. Phase 1 Build Plan

### 9.1 New Files to Create

A new route is added under the customer section of the app at `src/app/customer/voice-session/[session_id]/page.tsx`. This becomes the entry point for all V2 voice sessions.

A new folder `src/components/voice/` holds all voice-specific components and hooks:

- **VoiceSessionShell** – the top-level container; owns the WebSocket connection and the state machine; orchestrates all child components
- **VoiceWave** – the canvas-based waveform visualiser; receives the current audio state and renders accordingly
- **VoiceQuestionCard** – displays the current question text, progress indicator, and optional footnote
- **VoiceAnswerOptions** – renders the tappable answer tiles for the current question; receives a callback when a tile is tapped
- **VoiceNavBar** – renders the mute toggle, back button, and forward button; disables forward until an answer is selected
- **useVoiceSession** – a custom hook that manages the WebSocket lifecycle, audio input, state transitions, and REST calls to the backend
- **useAudioVisualizer** – a custom hook that sets up the Web Audio API analyser and provides frequency data on each animation frame

### 9.2 VoiceSessionShell Responsibilities

This component is the orchestrator. On mount it opens the WebSocket to OpenAI Realtime and sends the session's system prompt along with the full question list as context. It manages the session state via a reducer so all state transitions are explicit and traceable. When the AI calls `submit_answer`, the shell intercepts it, sends the answer to the backend via REST, updates local state, and then signals the AI to proceed. If the WebSocket disconnects unexpectedly, the shell attempts to reconnect and resumes from the saved question index.

### 9.3 Answer Submission Flow

The end-to-end flow for a single question works as follows: the AI speaks the question text and reads out the available options. The customer either taps a tile or speaks their answer. If spoken, the speech recognition result is matched to the nearest option and that tile is highlighted. The AI confirms what it heard and the customer affirms by tap or voice. The application then saves the answer to the database in the background. The AI says a brief acknowledgement ("Verstanden.") and signals the session to advance. The new question card slides in and the cycle repeats.

### 9.4 VoiceWave Rendering

The waveform component connects to the Web Audio API's frequency analyser, which provides an array of amplitude values across the audio frequency spectrum. On every animation frame (targeting 60fps), the component reads the latest frequency data and redraws a row of vertical bars on the canvas. Each bar's height is proportional to the amplitude at that frequency. The colour of the bars changes depending on the current voice state: indigo while the AI is speaking, green while the user is being listened to, and grey when idle or muted.

### 9.5 Mute Behaviour

Muting stops the audio output by reducing the output gain to zero. The WebSocket stays open and the AI continues to process the session internally. The question card and options remain interactive so the customer can continue by tapping. A label on the mute button reads "Stumm – tippen Sie Ihre Antwort" to remind the customer that tap input still works. Unmuting resumes audio and the AI re-reads the current question.

---

## 10. API Contracts (Phase 1)

All existing API routes remain unchanged. The following routes are used by Phase 1:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/questions` | GET | Load the full question list with options |
| `/api/answers` | POST | Save a single answer |
| `/api/phase` | PATCH | Advance the session to the next phase |
| `/api/qa-session/create` | POST | Create a new session |
| `/api/admin/dashboard/chat-messages` | GET | Admin view of conversation log |

One new endpoint is needed for Phase 1: `PATCH /api/qa-session/[sessionId]/voice-state`. It accepts the current question index and the resume point phase name, and writes them into the workflow state's voice sub-object. This is called after every confirmed answer so the resume data is always current.

---

## 11. Admin Dashboard V2 Additions

The existing admin dashboard requires no structural changes for V2. The voice session transcript (every turn the AI spoke and every answer the customer gave) is stored in the same Thread and Message tables already used by the v1 text chatbot. The existing "KI Unterhaltung" drawer in the dashboard will display voice turns exactly as it displays text messages today, using the same customer/assistant role structure.

---

## 12. Design Tokens (Mobile-First)

The following sizing and spacing values ensure consistent implementation across all voice components:

**Voice wave container** – 64px tall, full width, content centred horizontally with 24px padding on each side

**Answer option tile** – minimum 56px tall (thumb-friendly tap target), 12px border radius, 14px vertical and 16px horizontal padding, 16px font size, 1.4 line height, full width

**Question card** – 16px border radius, 20px padding on all sides, 18px bold font size, 1.5 line height, minimum 120px tall

**Navigation bar** – 64px tall, 16px horizontal padding, 12px gap between buttons, bottom padding equal to the device's safe area inset (for iPhone home bar)

**Colour palette** (consistent with v1 indigo theme):

| State | Colour |
|-------|--------|
| AI speaking (wave) | Indigo 600 – `#4F46E5` |
| User STT active (wave) | Green 600 – `#16A34A` |
| Selected answer tile background | Indigo 50 – `#EEF2FF` |
| Selected answer tile border | Indigo 600 – `#4F46E5` |
| Muted / idle wave | Gray 400 – `#9CA3AF` |

---

## 13. Open Questions / Decisions Before Build

| # | Question | Suggested Default |
|---|----------|------------------|
| 1 | Route the WebSocket directly from the browser to OpenAI, or proxy it through the Next.js server? | **Proxy through server** – keeps the API key private and enables server-side logging of voice turns |
| 2 | Allow spoken answers (STT) in Phase 1, or tap-only to start? | **Tap-only first** – simpler to build and test; add STT as Phase 1b once tap flow is stable |
| 3 | Which OpenAI voice to use? | **nova** – warm, neutral, works well for German |
| 4 | Should the AI read out the full terms text, or a short summary? | **Short summary** (2–3 sentences per disclosure) + customer confirms by tapping "Verstanden" |
| 5 | Store voice transcripts in the existing Thread / Message tables? | **Yes** – avoids a new DB model and makes them visible in the existing admin chat view |
| 6 | What happens if the customer denies microphone permission? | **Silent tap-only fallback** – wave visualiser hides, no error shown |
| 7 | Save resume position per question or only per phase? | **Per question** – finer granularity, no risk of losing up to 13 answers on disconnect |

---

## 14. Out of Scope for Phase 1

The following items are explicitly deferred to later phases or future sprints:

- ElevenLabs voice integration
- Spoken answer input (STT) – deferred to Phase 1b
- Product suggestion voice explanation (Phase 2)
- Personal info voice form filling (Phase 4)
- SignTeq signing with voice guidance (Phase 5)
- Multi-language support
- Admin playback of voice audio recordings

---

## 15. Acceptance Criteria – Phase 1

- Customer opens the voice session on mobile and the AI speaks an opening greeting within two seconds of the page loading
- The AI reads each question and its answer options aloud in German using formal address
- The customer can tap any answer tile, the answer is saved to the database, the AI acknowledges it, and the next question appears
- The waveform animates visibly and in sync with the AI's audio output
- The mute button silences the AI's voice but the session remains fully interactive via tapping
- The back button causes the AI to re-read the previous question and restores the previously given answer as highlighted
- If the customer closes the browser and returns, the session resumes from the last unanswered question with an AI greeting that explains the resume point
- After all fifteen questions and three terms confirmations are completed, the session advances to a Phase 2 placeholder screen
- All answers are persisted to the database in the same format as v1, so the existing admin dashboard "Frage & Antwort" view shows them correctly
- The feature works correctly on iOS Safari 16 and above, and on Android Chrome 110 and above

---

*End of specification. Phase 1 implementation can start once the decisions in Section 13 are confirmed.*