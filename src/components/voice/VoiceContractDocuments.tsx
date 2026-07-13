"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Menu, User, Mic, ChevronRight } from "lucide-react";
import { AnimatedFrame } from "./AnimatedFrame";
import PDFModal from "@/components/PDFModal";
import type { CarouselQuestion } from "./VoiceCarousel";
import type { SessionState } from "@/hooks/useVoiceSession";

// ── Frame sizing — same portrait "document card" proportions used by every other
// voice-frame phase (Phase 2's getPdfSize(), Phase 4's getInvestmentFrameSize()). Each phase
// keeps its own local copy rather than sharing one — established pattern, not an oversight. ──
function getContractFrameSize() {
  const vw = typeof window !== "undefined" ? window.innerWidth  : 640;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  if (vw >= 1024) {
    const maxH = Math.round(vh * 0.68);
    const w    = Math.min(Math.round(maxH / 1.414), 500);
    return { width: w, height: Math.round(w * 1.414) };
  } else if (vw >= 640) {
    const maxH = Math.round(vh * 0.72);
    const w    = Math.min(Math.round(maxH / 1.414), 420);
    return { width: w, height: Math.round(w * 1.414) };
  } else {
    const w = Math.min(Math.round(vw * 0.78), 320);
    return { width: w, height: Math.round(w * 1.414) };
  }
}

// ── Document list — same 8 files, same two accordion sections as V1's ContractDocuments.tsx ──
const VERTRAEGE_DOCS = [
  { file: "Depoteröffnungsantrag.pdf",       label: "Depoteröffnungsantrag" },
  { file: "Deckblatt_Vertragspaket.pdf",     label: "Deckblatt Vertragspaket" },
  { file: "Vermögensverwaltungsvertrag.pdf", label: "Vermögensverwaltungsvertrag" },
  { file: "Vermittlungsgebühr.pdf",          label: "Vermittlungsgebühr" },
  { file: "Servicegebühr.pdf",               label: "Servicegebühren" },
  { file: "Serviceentgelt.pdf",              label: "Serviceentgelt" },
  { file: "4money_protokoll_PecunAI_v.pdf",  label: "4money Protokoll" },
] as const;

const WEITERE_INFO_DOCS = [
  { file: "Froots_Allgemeine_Informationsbroschüren.pdf", label: "Froots Allgemeine Informationsbroschüren" },
] as const;

// ── Checkbox state — same shape and cascade logic as V1's stepper/[session_id]/page.tsx
// (handleCheckboxChangeContractDocument / handleAcceptAll). ──────

interface Agreements {
  acceptAll:            boolean;
  dataProtection:       boolean;
  vermoegensverwaltung: boolean;
  bankenbedingungen:    boolean;
  widerruf:             boolean;
  efsaeg:               boolean;
  informationen:        boolean;
  auftraggeber:         boolean;
  einverstanden:        boolean;
  disclaimer:           boolean;
}

const INITIAL_AGREEMENTS: Agreements = {
  acceptAll:            false,
  dataProtection:       false,
  vermoegensverwaltung: false,
  bankenbedingungen:    false,
  widerruf:             false,
  efsaeg:               false,
  informationen:        false,
  auftraggeber:         false,
  einverstanden:        false,
  disclaimer:           false,
};

const STATUS_LABEL: Record<SessionState, string> = {
  idle:        "Bereit...",
  connecting:  "Verbinde...",
  greeting:    "PecunAI begrüßt Sie...",
  speaking:    "PecunAI spricht",
  listening:   "Zuhören...",
  processing:  "Verarbeite...",
  muted:       "Stumm – tippen Sie Ihre Antwort",
  paused:      "Pausiert...",
  resuming:    "Willkommen zurück...",
  error:       "Verbindungsfehler – Tippen Sie weiter",
};

interface VoiceContractDocumentsProps {
  sessionId:    string;
  questions:    CarouselQuestion[];
  answers:      Record<string, string>;
  isSpeaking:   boolean;
  sessionState: SessionState;
  onPTTStart:   () => void;
  onPTTRelease: () => void;
  onConfirm:    () => void;
}

export default function VoiceContractDocuments({
  sessionId,
  questions,
  answers,
  isSpeaking,
  sessionState,
  onPTTStart,
  onPTTRelease,
  onConfirm,
}: VoiceContractDocumentsProps) {
  const [frameSize, setFrameSize] = useState<{ width: number; height: number } | null>(null);
  const [isPTTActive, setIsPTTActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [agreements, setAgreements] = useState<Agreements>(INITIAL_AGREEMENTS);
  const [expandedSections, setExpandedSections] = useState({ vertraege: false, weitereInfo: false });
  const [selectedPDF, setSelectedPDF] = useState<{ url: string; fileName: string } | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  useEffect(() => {
    setFrameSize(getContractFrameSize());
    const onResize = () => setFrameSize(getContractFrameSize());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Generate the 8 contract PDFs on phase entry — same trigger as V1's `useEffect` on
  // `step === PHASES.CONTRACT_DOCUMENT`. userInfo is fetched fresh from the DB (same
  // fields/shape as VoicePersonalInfoForm.tsx's fetchUserInfo — never carried over via
  // Zustand/localStorage, per the standing PII rule). V1 blocks its whole UI behind `loading`
  // while this runs (a few seconds — 8 PDF fills) — mirrored here by gating the accordion.
  useEffect(() => {
    const generateContractDocuments = async () => {
      setLoading(true);
      try {
        const userInfoRes  = await fetch(`/api/user/info/${sessionId}`, { method: "GET" });
        const userInfoData = await userInfoRes.json();
        if (!userInfoData?.success || !userInfoData.user) {
          throw new Error(userInfoData?.message || "Failed to load user info");
        }
        const user = userInfoData.user;
        const userInfo = {
          firstName:           user.firstName || "",
          lastName:            user.lastName || "",
          birthPlace:          user.placeOfBirth || "",
          birthCountry:        user.birthCountry || "",
          nationality:         user.nationality || "",
          birthDate:           user.dateOfBirth || "",
          maritalStatus:       user.maritalStatus || "",
          street:              user.street || "",
          houseNumber:         user.houseNumber || "",
          postalCode:          user.postalCode || "",
          city:                user.city || "",
          countryCode:         user.countryCode || "+43",
          phone:               user.phone || "",
          email:               user.email || "",
          iban:                user.iban || "",
          education:           user.education || "",
          currentJob:          user.currentProfession || "",
          industry:            user.industry || "",
          occupation:          user?.previousJobsRel?.[0]?.jobTitle || "",
          documentType:        user?.documents?.[0]?.documentType || "",
          documentNumber:      user?.documents?.[0]?.documentNumber || "",
          issuingAuthority:    user?.documents?.[0]?.issuingAuthority || "",
          issuedOn:            user?.documents?.[0]?.issuedOn || "",
          validUntil:          user?.documents?.[0]?.validUntil || "",
          isPEP:               user.isPep || false,
          residenceAbroad:     user.residenceAbroad || false,
          actingFor:           user.actsOnOwnAccount ? "own" : "other",
          magicFlow:           process.env.NEXT_PUBLIC_ENV === "development",
          country:             user.country || "",
          bic:                 user.bic || "",
          bankName:            user.bankName || "",
          isTaxResidentAT:     user.isTaxResidentAT ?? null,
          isTaxResidentOther:  user.isTaxResidentOther ?? null,
          gender:              user.gender || "",
          isSelfEmployed:      user.isSelfEmployed || false,
          taxResidencyCountry: user.taxResidencyCountry || "",
        };

        const response = await fetch("/api/phase/contract-document", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ sessionId, userInfo, questions, answers }),
        });
        const data = await response.json();
        if (!data.success) {
          console.error("Failed to generate contract documents:", data.error);
        }
      } catch (error) {
        console.error("Error generating contract documents:", error);
      } finally {
        setLoading(false);
      }
    };
    generateContractDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      vertraege:   false,
      weitereInfo: false,
      [section]:   !prev[section],
    }));
  }, []);

  // Cascade logic copied verbatim from V1's handleCheckboxChangeContractDocument / handleAcceptAll.
  const handleCheckboxChange = useCallback((field: keyof Agreements) => {
    setAgreements(prev => {
      const updated = { ...prev, [field]: !prev[field] };

      const allChecked =
        updated.dataProtection &&
        updated.vermoegensverwaltung &&
        updated.bankenbedingungen &&
        updated.widerruf &&
        updated.efsaeg &&
        updated.informationen &&
        updated.auftraggeber &&
        updated.einverstanden &&
        updated.disclaimer;

      if (allChecked) {
        updated.acceptAll = true;
      } else if (updated.acceptAll) {
        updated.acceptAll = false;
      }

      return updated;
    });
  }, []);

  const handleAcceptAll = useCallback(() => {
    setAgreements(prev => {
      const newValue = !prev.acceptAll;
      return {
        acceptAll:            newValue,
        dataProtection:       newValue,
        vermoegensverwaltung: newValue,
        bankenbedingungen:    newValue,
        widerruf:             newValue,
        efsaeg:               newValue,
        informationen:        newValue,
        auftraggeber:         newValue,
        einverstanden:        newValue,
        disclaimer:           newValue,
      };
    });
  }, []);

  const openPDF = useCallback((fileName: string) => {
    setSelectedPDF({ url: `/api/documents/${sessionId}/contract-document/${fileName}`, fileName });
  }, [sessionId]);

  const closePDF = useCallback(() => setSelectedPDF(null), []);

  const handleMergePDFs = useCallback(async () => {
    setIsMerging(true);
    try {
      const response = await fetch("/api/documents/merge", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ sessionId }),
      });
      if (!response.ok) throw new Error("Failed to merge PDFs");

      const fileName = response.headers.get("Content-Disposition")?.split("filename=")[1] || "merged-contracts.pdf";
      const blob = await response.blob();
      const url  = window.URL.createObjectURL(blob);
      setSelectedPDF({ url, fileName: fileName.replace(/"/g, "") });
    } catch (error) {
      console.error("Error merging PDFs:", error);
    } finally {
      setIsMerging(false);
    }
  }, [sessionId]);

  const statusLabel = STATUS_LABEL[sessionState] ?? "";

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-x-hidden"
      style={{ background: "linear-gradient(180deg, rgba(239,246,255,1) 0%, rgba(255,255,255,1) 50%, rgba(249,250,251,1) 100%)" }}
    >
      {/* ── Header — identical structure to VoiceProductPhase / VoiceInvestmentForm ─── */}
      <div className="w-full px-6 py-5 relative z-10">
        <div className="flex items-center justify-between">
          <motion.button
            className="flex items-center justify-center rounded-full"
            style={{ width: 44, height: 44, background: "rgba(255,255,255,0.6)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
            whileTap={{ scale: 0.95 }}
          >
            <Menu size={20} style={{ color: "rgba(59,130,246,0.8)" }} />
          </motion.button>

          <motion.h1
            className="text-2xl font-bold tracking-tight"
            style={{ background: "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            Vox.2
          </motion.h1>

          <motion.button
            className="flex items-center justify-center rounded-full"
            style={{ width: 44, height: 44, background: "rgba(255,255,255,0.6)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
            whileTap={{ scale: 0.95 }}
          >
            <User size={20} style={{ color: "rgba(59,130,246,0.8)" }} />
          </motion.button>
        </div>
      </div>

      {/* ── Scrollable center ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto pb-24 pt-4 md:pt-10 gap-4">
        {frameSize && (
          <div className="w-full flex justify-center">
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              <AnimatedFrame
                isSpeaking={isSpeaking}
                isListening={isPTTActive}
                contentWidth={frameSize.width}
                contentHeight={frameSize.height}
              >
                <div
                  className="w-full h-full overflow-y-auto p-5 space-y-5"
                  style={{ background: "rgba(255,255,255,0.97)" }}
                >
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-gray-500 animate-pulse">Vertragsdokumente werden erstellt...</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h2 className="text-base font-bold text-gray-900 mb-1">Vertragsdokumente</h2>
                        <p className="text-xs text-gray-600 mb-3">
                          Akzeptiere die Vertragsbedingungen, um deine Depoteröffnung im nächsten Schritt mit einem
                          digitalen Signaturprozess abzuschließen.
                        </p>
                        <motion.button
                          className="w-full text-xs font-semibold rounded-xl py-2.5 mb-1"
                          style={{ background: "rgba(59,130,246,0.1)", color: "rgba(37,99,235,1)" }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleMergePDFs}
                          disabled={isMerging}
                        >
                          {isMerging ? "Vertrag Exportieren..." : "Vertrag Exportieren"}
                        </motion.button>
                      </div>

                      {/* Accordion — Verträge / Weitere Informationen */}
                      <div className="space-y-2">
                        <div>
                          <button
                            onClick={() => toggleSection("vertraege")}
                            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <span className="text-sm font-medium text-gray-900">Verträge</span>
                            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedSections.vertraege ? "rotate-90" : ""}`} />
                          </button>
                          {expandedSections.vertraege && (
                            <div className="p-2 bg-white mt-1 rounded-lg border border-gray-200 space-y-1">
                              {VERTRAEGE_DOCS.map(doc => (
                                <button
                                  key={doc.file}
                                  onClick={() => openPDF(doc.file)}
                                  className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded transition-colors text-left"
                                >
                                  <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                  <span className="text-xs text-gray-700">{doc.label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <button
                            onClick={() => toggleSection("weitereInfo")}
                            className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <span className="text-sm font-medium text-gray-900">Weitere Informationen</span>
                            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedSections.weitereInfo ? "rotate-90" : ""}`} />
                          </button>
                          {expandedSections.weitereInfo && (
                            <div className="p-2 bg-white mt-1 rounded-lg border border-gray-200 space-y-1">
                              {WEITERE_INFO_DOCS.map(doc => (
                                <button
                                  key={doc.file}
                                  onClick={() => openPDF(doc.file)}
                                  className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded transition-colors text-left"
                                >
                                  <svg className="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                  <span className="text-xs text-gray-700">{doc.label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bestätigungs-Checkboxen — same text as V1, verbatim */}
                      <div className="space-y-3 pt-2 border-t border-gray-100">
                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={agreements.acceptAll}
                            onChange={handleAcceptAll}
                            className="w-5 h-5 text-blue-600 rounded mt-0.5 flex-shrink-0 cursor-pointer"
                          />
                          <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            Alles akzeptieren
                          </span>
                        </label>

                        <label className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={agreements.dataProtection}
                            onChange={() => handleCheckboxChange("dataProtection")}
                            className="w-5 h-5 text-blue-600 rounded mt-1 flex-shrink-0"
                          />
                          <span className="text-xs text-gray-700">
                            Ich erkläre, dass ich mit der gesetzeskonformen Datenverarbeitung gemäß Datenschutz –
                            Grundverordnung und den Vertragsbedingungen von froots (Asset Management by froots GmbH),
                            4money (4money Financial Services GmbH) und der Partnerbank Die Plattform (Schelhammer
                            Capital Bank AG) einverstanden bin.
                          </span>
                        </label>

                        <label className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={agreements.vermoegensverwaltung}
                            onChange={() => handleCheckboxChange("vermoegensverwaltung")}
                            className="w-5 h-5 text-blue-600 rounded mt-1 flex-shrink-0"
                          />
                          <span className="text-xs text-gray-700">
                            Ich beauftrage froots (Asset Management by froots GmbH) hiermit mit der
                            Vermögensverwaltung und erteile dieser gegenüber der Partnerbank Die Plattform
                            (Schelhammer Capital Bank AG) eine Verwaltungsvollmacht.
                          </span>
                        </label>

                        <label className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={agreements.bankenbedingungen}
                            onChange={() => handleCheckboxChange("bankenbedingungen")}
                            className="w-5 h-5 text-blue-600 rounded mt-1 flex-shrink-0"
                          />
                          <span className="text-xs text-gray-700">
                            Ich entbinde darüber hinaus die Partnerbank Die Plattform (Schelhammer Capital Bank AG)
                            vom Bankengeheimnis gemäß §38 Abs. 2 Z5 BWG.
                          </span>
                        </label>

                        <label className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={agreements.widerruf}
                            onChange={() => handleCheckboxChange("widerruf")}
                            className="w-5 h-5 text-blue-600 rounded mt-1 flex-shrink-0"
                          />
                          <span className="text-xs text-gray-700">
                            Ich erteile meine widerrufliche Zustimmung, dass sämtliche mich betreffenden Daten, die
                            mit dieser Geschäftsverbindung in Zusammenhang stehen, auch mit der Partnerbank Die
                            Plattform (Schelhammer Capital Bank AG) geteilt werden können.
                          </span>
                        </label>

                        <label className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={agreements.disclaimer}
                            onChange={() => handleCheckboxChange("disclaimer")}
                            className="w-5 h-5 text-blue-600 rounded mt-1 flex-shrink-0"
                          />
                          <span className="text-xs text-gray-700">
                            Rücktrittsrecht: Ich erteile gemäß §8 Abs. 5 FernFinG ausdrücklich meine Zustimmung, dass
                            mit der Erfüllung der Verträge bereits vor Ablauf der 14-tägigen Rücktrittsfrist begonnen
                            wird.
                          </span>
                        </label>

                        <label className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={agreements.einverstanden}
                            onChange={() => handleCheckboxChange("einverstanden")}
                            className="w-5 h-5 text-blue-600 rounded mt-1 flex-shrink-0"
                          />
                          <span className="text-xs text-gray-700">
                            Ich bin einverstanden, dass ich in Zukunft alle Informationen von froots (Asset
                            Management by froots GmbH), 4money (4money Financial Services GmbH) und persönlich an
                            mich gerichtete Informationen nach WAG und Mitteilungen der Partnerbank Die Plattform
                            (Schelhammer Capital Bank AG) auf elektronischem Weg oder per Onlinezugang erhalte und
                            verstehe, dass ich die Dienstleistung sonst nicht in Anspruch nehmen kann.
                          </span>
                        </label>

                        <label className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={agreements.efsaeg}
                            onChange={() => handleCheckboxChange("efsaeg")}
                            className="w-5 h-5 text-blue-600 rounded mt-1 flex-shrink-0"
                          />
                          <span className="text-xs text-gray-700">
                            Ich hab die Informationen zum Einlagensicherungs- und Anlegerentschädigungsgesetz (ESAEG)
                            der Partnerbank Die Plattform (Schelhammer Capital Bank AG) erhalten.
                          </span>
                        </label>

                        <label className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={agreements.informationen}
                            onChange={() => handleCheckboxChange("informationen")}
                            className="w-5 h-5 text-blue-600 rounded mt-1 flex-shrink-0"
                          />
                          <span className="text-xs text-gray-700">
                            Ich habe alle relevanten Dokumente von froots (Asset Management by froots GmbH), 4money
                            (4money Financial Services GmbH) und der Partnerbank Die Plattform (Schelhammer Capital
                            Bank AG) inklusive dem gültigen Konditionsblatt erhalten, vollständig gelesen und erkläre
                            mich hiermit ausdrücklich damit einverstanden.
                          </span>
                        </label>

                        <label className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={agreements.auftraggeber}
                            onChange={() => handleCheckboxChange("auftraggeber")}
                            className="w-5 h-5 text-blue-600 rounded mt-1 flex-shrink-0"
                          />
                          <span className="text-xs text-gray-700">
                            Ich stimme hiermit zu, dass Asset Management by froots GmbH alle betreffenden Daten aus
                            der Geschäftsverbindung mit Asset Management by froots GmbH, die im Zusammenhang mit der
                            Portfolioverwaltung stehen, wie etwa Informationen zur Veranlagung (Performance,
                            Asset-Allocation), gegenüber der 4money zum Zweck der Erbringung von eigenen
                            Wertpapierdienstleistungen (Anlageberatung) durch 4money offenlegt und entbinde Asset
                            Management by froots GmbH insoweit von der Verschwiegenheitspflicht nach § 8 Abs 1 WAG
                            2018.
                          </span>
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </AnimatedFrame>
            </motion.div>
          </div>
        )}

        {/* ── Bestätigen — same styling as VoiceInvestmentForm's confirm button ── */}
        {frameSize && (
          <div style={{ width: frameSize.width, marginTop: 10, marginBottom: 32, paddingLeft: 16, paddingRight: 16, boxSizing: "border-box" }}>
            <motion.button
              className="w-full text-sm font-semibold rounded-2xl text-white py-3"
              style={{
                background: agreements.acceptAll
                  ? "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)"
                  : "rgba(148,163,184,0.3)",
                color:     agreements.acceptAll ? "white" : "rgba(100,116,139,0.5)",
                boxShadow: agreements.acceptAll ? "0 4px 16px rgba(59,130,246,0.35)" : "none",
              }}
              whileTap={agreements.acceptAll ? { scale: 0.97 } : {}}
              onClick={onConfirm}
              disabled={!agreements.acceptAll}
            >
              Bestätigen
            </motion.button>
          </div>
        )}

        <p className="text-sm font-medium" style={{ color: "rgba(59,130,246,0.7)" }}>
          {statusLabel}
        </p>
      </div>

      {/* ── PTT button — fixed bottom-right, identical to VoiceInvestmentForm ── */}
      <div className="fixed bottom-8 right-6 flex flex-col items-center gap-2 z-[60]">
        {!isPTTActive && !isSpeaking && (
          <p className="text-xs font-medium text-center" style={{ color: "rgba(59,130,246,0.7)" }}>
            Halten zum<br />Sprechen
          </p>
        )}
        <motion.button
          className="flex items-center justify-center rounded-full shadow-xl border-2 ptt-button"
          style={{
            width: 64, height: 64,
            background: isPTTActive
              ? "linear-gradient(135deg, rgba(37,99,235,1) 0%, rgba(29,78,216,1) 100%)"
              : "linear-gradient(135deg, rgba(59,130,246,1) 0%, rgba(37,99,235,1) 100%)",
            borderColor: isPTTActive ? "rgba(29,78,216,0.8)" : "rgba(59,130,246,0.3)",
          }}
          animate={isPTTActive ? { scale: [0.93, 0.96, 0.93] } : { scale: 1 }}
          transition={isPTTActive ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : {}}
          onMouseDown={() => { setIsPTTActive(true); onPTTStart(); }}
          onMouseUp={() => { setIsPTTActive(false); onPTTRelease(); }}
          onMouseLeave={isPTTActive ? () => { setIsPTTActive(false); onPTTRelease(); } : undefined}
          onTouchStart={() => { setIsPTTActive(true); onPTTStart(); }}
          onTouchEnd={() => { setIsPTTActive(false); onPTTRelease(); }}
          onTouchCancel={() => { setIsPTTActive(false); onPTTRelease(); }}
        >
          <Mic className="text-white" size={26} />
        </motion.button>
      </div>

      {selectedPDF && (
        <PDFModal isOpen={!!selectedPDF} pdfUrl={selectedPDF.url} fileName={selectedPDF.fileName} onClose={closePDF} />
      )}
    </div>
  );
}
