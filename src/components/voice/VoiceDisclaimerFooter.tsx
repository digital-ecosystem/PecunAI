"use client";

// Persistent, non-dismissible legal disclaimer — visible at the bottom of every voice-session
// screen (all 8 phases, all gate modals), per client feedback (3rd-feedback.txt, 2026-07-25).
// Mounted once in page.tsx, outside VoiceSessionShell, so it reserves real layout space rather
// than overlaying — see private-documents/after-demo/PRIORITY_FIXES_3RD_FEEDBACK_PLAN.md.
export default function VoiceDisclaimerFooter() {
  return (
    <div
      className="w-full px-4 pt-2 text-center shrink-0"
      style={{
        background:    "rgba(255,255,255,0.97)",
        paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))",
      }}
    >
      <p className="text-[10px] leading-snug max-w-2xl mx-auto" style={{ color: "rgba(100,116,139,0.85)" }}>
        Der digitale Assistent unterstützt Sie bei allen Fragen rund um Ihre Investition und
        stellt Ihnen die relevanten Informationen bestmöglich zur Verfügung. Obwohl
        selbstverständlich alles daran gesetzt wird, Unschärfen zu vermeiden, können in
        Einzelfällen dennoch Ungenauigkeiten auftreten. Sämtliche Angaben und Empfehlungen werden
        am Ende von einem Berater der 4money Financial Services überprüft. Sollten Angaben in
        diesem Chat ungenau oder inkorrekt gewesen sein, wird der Berater mit Ihnen zur
        Klarstellung Kontakt aufnehmen.
      </p>
    </div>
  );
}
