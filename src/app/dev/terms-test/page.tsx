"use client";

/**
 * DEV-ONLY harness — mounts Phase 0's VoiceTermsPhase with the shell's exact
 * wiring (single persistent instance, no key) to exercise the terms1 → terms2
 * in-frame content crossfade AND the terms2 → Phase 1 frame-collapse handoff
 * without a live voice session. Safe to delete.
 */

import { useState, useEffect, useRef } from "react";
import VoiceTermsPhase from "@/components/voice/VoiceTermsPhase";
import { PhaseOneNeuralModel } from "@/components/voice/PhaseOneNeuralModel";
import type { FrameRect } from "@/components/voice/frameMath";

export default function TermsTestPage() {
  const [step, setStep] = useState<"terms1" | "terms2" | "phase1">("terms1");
  const exitRectRef = useRef<FrameRect | null>(null);

  // Mirrors the shell's Phase 1 orb wrapper + per-frame rect poll.
  const [orbOrigin, setOrbOrigin] = useState<{ x: number; y: number } | null>(null);
  const orbWrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (step !== "phase1") return;
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
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, [step]);

  return (
    <>
      <div id="state-readout" className="fixed top-2 left-2 z-[99] text-xs font-mono" data-step={step}>
        step={step}
        <button
          id="reset-btn"
          className="ml-3 px-2 py-0.5 rounded border border-blue-300 text-blue-600"
          onClick={() => { exitRectRef.current = null; setStep("terms1"); }}
        >
          Reset
        </button>
      </div>

      {step !== "phase1" && (
        <VoiceTermsPhase
          which={step}
          isSpeaking={false}
          onConfirm={async () => {
            if (step === "terms1") setStep("terms2");
            else setStep("phase1");
          }}
          onPTTStart={() => {}}
          onPTTRelease={() => {}}
          onExitRect={(rect) => { exitRectRef.current = rect; }}
        />
      )}

      {step === "phase1" && (
        <div
          className="fixed inset-0 flex flex-col overflow-hidden"
          style={{ background: "linear-gradient(180deg, rgba(239,246,255,1) 0%, rgba(255,255,255,1) 50%, rgba(249,250,251,1) 100%)" }}
        >
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <div ref={orbWrapperRef} className="relative z-10" style={{ width: 380, height: 380 }} />
          </div>
          <div className="relative z-20 -mt-24 mb-8 h-[240px] flex items-center justify-center">
            <p className="text-sm" style={{ color: "rgba(59,130,246,0.6)" }}>[ Phase 1 carousel here ]</p>
          </div>
          {orbOrigin && (
            <PhaseOneNeuralModel
              shape="orb"
              frameRect={null}
              initialFrameRect={exitRectRef.current}
              sphereCenter={orbOrigin}
              sphereRadius={380 * 0.3}
              isSpeaking={false}
              isListening={false}
              containerWidth={typeof window !== "undefined" ? window.innerWidth : 0}
              containerHeight={typeof window !== "undefined" ? window.innerHeight : 0}
            />
          )}
        </div>
      )}
    </>
  );
}
