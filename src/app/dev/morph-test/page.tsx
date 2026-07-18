"use client";

/**
 * DEV-ONLY harness — replicates VoiceSessionShell's Phase 1 orb ⇄ cardFrame
 * expand/collapse wiring 1:1 (same components, same derived props, same
 * handlers) without needing a live voice session. Used to reproduce and fix
 * the expand/collapse transition bugs. Safe to delete.
 */

import { useState, useEffect, useRef } from "react";
import { AnimatePresence } from "motion/react";
import VoiceCarousel, { CarouselQuestion } from "@/components/voice/VoiceCarousel";
import { ExpandedQuestionCard, computeExpandedRect } from "@/components/voice/ExpandedQuestionCard";
import { SustainabilityTermsCard } from "@/components/voice/SustainabilityTermsCard";
import { PhaseOneNeuralModel } from "@/components/voice/PhaseOneNeuralModel";
import type { FrameRect } from "@/components/voice/frameMath";

const QUESTIONS: CarouselQuestion[] = [
  {
    id: "q1",
    category: "Frage",
    text: "Anlageziele – Welches Ziel verfolgen Sie mit Ihrer geplanten Veranlagung?",
    questionType: "choice",
    options: [
      { id: "o1", value: "aufbau", label: "Allgemeiner Vermögensaufbau" },
      { id: "o2", value: "vorsorge", label: "Altersvorsorge" },
      { id: "o3", value: "diversifikation", label: "Diversifikation des Gesamtvermögens" },
      { id: "o4", value: "sonstiges", label: "Sonstiges" },
    ],
  },
  {
    id: "q2",
    category: "Frage",
    text: "Angedachte Anlagedauer – Wie lange möchten Sie voraussichtlich investieren?",
    questionType: "choice",
    options: [
      { id: "o1", value: "u3", label: "Unter 3 Jahre" },
      { id: "o2", value: "3-5", label: "3–5 Jahre" },
      { id: "o3", value: "5-10", label: "5–10 Jahre" },
      { id: "o4", value: "10+", label: "Mehr als 10 Jahre" },
    ],
  },
  {
    id: "q3",
    category: "Frage",
    text: "Risikoneigung – Wie würden Sie Ihre persönliche Risikobereitschaft einschätzen?",
    questionType: "choice",
    options: [
      { id: "o1", value: "niedrig", label: "Niedrig" },
      { id: "o2", value: "mittel", label: "Mittel" },
      { id: "o3", value: "hoch", label: "Hoch" },
    ],
  },
];

export default function MorphTestPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [sustOpen, setSustOpen] = useState(false);
  const [viewIndex, setViewIndex] = useState(0);

  // Fake "AI voice": amplitude-modulated noise through a muted analyser graph,
  // so the orb's real FFT-reactive path can be exercised without a session.
  const [speaking, setSpeaking] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const toggleSpeaking = () => {
    if (!speaking && !audioCtxRef.current) {
      const ctx = new AudioContext();
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const t = i / ctx.sampleRate;
        d[i] = (Math.random() * 2 - 1) * (0.25 + 0.75 * Math.abs(Math.sin(t * 2.7)));
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      const mute = ctx.createGain();
      mute.gain.value = 0;
      src.connect(an);
      an.connect(mute);
      mute.connect(ctx.destination);
      src.start();
      audioCtxRef.current = ctx;
      setAnalyser(an);
    }
    setSpeaking(s => !s);
  };

  const [orbOrigin, setOrbOrigin] = useState<{ x: number; y: number } | null>(null);
  const [expandedRect, setExpandedRect] = useState<FrameRect | null>(null);
  const orbWrapperRef = useRef<HTMLDivElement>(null);

  // Entry gate mirrors the real shell: the orb wrapper does NOT exist at page
  // mount (disclaimer/terms/tap-to-start render first), which is exactly the
  // scenario that made the sphere render blank on desktop.
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const measure = () => setExpandedRect(computeExpandedRect(window.innerWidth, window.innerHeight));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Same per-frame rect poll as VoiceSessionShell.
  useEffect(() => {
    if (!entered) return;
    let raf = 0;
    let alive = true;
    const tick = () => {
      const rect = orbWrapperRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0) {
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        setOrbOrigin(prev =>
          prev && Math.abs(prev.x - x) < 0.75 && Math.abs(prev.y - y) < 0.75 ? prev : { x, y }
        );
      }
      if (alive) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [entered]);

  const n = QUESTIONS.length;
  const modalQ = QUESTIONS[viewIndex];

  if (!entered) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <button
          id="enter-btn"
          className="px-6 py-3 rounded-2xl text-white font-semibold"
          style={{ background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" }}
          onClick={() => setEntered(true)}
        >
          Enter Phase 1
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(180deg, rgba(239,246,255,1) 0%, rgba(255,255,255,1) 50%, rgba(249,250,251,1) 100%)" }}
    >
      {/* state readout for the test driver */}
      <div id="state-readout" className="absolute top-2 left-2 z-[99] text-xs font-mono" data-modal-open={modalOpen}>
        modalOpen={String(modalOpen)} viewIndex={viewIndex}
        <button
          id="toggle-speaking"
          className="ml-3 px-2 py-0.5 rounded border border-blue-300 text-blue-600"
          onClick={toggleSpeaking}
        >
          {speaking ? "AI speaking: ON" : "AI speaking: OFF"}
        </button>
        <button
          id="toggle-sustainability"
          className="ml-2 px-2 py-0.5 rounded border border-blue-300 text-blue-600"
          onClick={() => setSustOpen(o => !o)}
        >
          Sustainability
        </button>
        <button
          id="simulate-q2-terms"
          className="ml-2 px-2 py-0.5 rounded border border-blue-300 text-blue-600"
          onClick={() => {
            // Mirrors the real Q2 → disclosure sequence with the shell's gap:
            // card closes, frame collapses to orb, beat, disclosure morphs out.
            setModalOpen(false);
            window.setTimeout(() => setSustOpen(true), 2200);
          }}
        >
          Q2→Terms
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative">
        <div ref={orbWrapperRef} className="relative z-10" style={{ width: 380, height: 380 }} />
      </div>

      <div className="relative z-20 -mt-24 mb-8">
        <VoiceCarousel
          questions={QUESTIONS}
          currentIndex={viewIndex}
          onNext={() => {
            if (modalOpen) return;
            setViewIndex(i => Math.min(i + 1, n - 1));
          }}
          onPrev={() => {
            if (modalOpen) return;
            setViewIndex(i => Math.max(i - 1, 0));
          }}
          onActiveCardExpand={() => setModalOpen(true)}
          onInfoClick={() => {}}
          expandedQuestionId={modalOpen ? modalQ?.id ?? null : null}
        />
      </div>

      {orbOrigin && (
        <PhaseOneNeuralModel
          shape={modalOpen || sustOpen ? "cardFrame" : "orb"}
          frameRect={modalOpen || sustOpen ? expandedRect : null}
          sphereCenter={orbOrigin}
          sphereRadius={380 * 0.3}
          isSpeaking={speaking}
          isListening={false}
          analyserNode={analyser}
          containerWidth={typeof window !== "undefined" ? window.innerWidth : 0}
          containerHeight={typeof window !== "undefined" ? window.innerHeight : 0}
        />
      )}

      <AnimatePresence>
        {sustOpen && expandedRect && (
          <SustainabilityTermsCard key="sust-card" rect={expandedRect} onConfirm={() => setSustOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalOpen && expandedRect && modalQ && (
          <ExpandedQuestionCard
            key={modalQ.id}
            rect={expandedRect}
            question={{
              number: viewIndex + 1,
              total: n,
              text: modalQ.text,
              options: modalQ.options ?? [],
              questionType: modalQ.questionType,
            }}
            onClose={() => setModalOpen(false)}
            onNext={() => {
              setModalOpen(false);
              setViewIndex(i => (i + 1) % n);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
