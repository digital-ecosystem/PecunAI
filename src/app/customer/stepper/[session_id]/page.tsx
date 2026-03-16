"use client";
import {
  Message,
  Option,
  PersonalInfoFormData,
  Question,
  Role,
  SessionStatus,
  // TermsAndConditions,
} from "@/types";
import { CheckCircle } from "lucide-react";
import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Viewer, Worker, SpecialZoomLevel } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
// import HTMLRenderer from '@/components/HTMLRenderer';
import '../index.css';
const QuestionCard = dynamic(() => import("../QuestionCard"), {
  ssr: false,
  loading: () => <div className="animate-pulse">Loading questions...</div>,
});
const PersonalInfoForm = dynamic(() => import("../PersonalInfoForm"), {
  ssr: false,
  loading: () => <div className="animate-pulse">Loading personal info...</div>,
});
const Chatbot = dynamic(() => import("../Chatbot"), {
  ssr: false,
  loading: () => <div className="animate-pulse">Loading personal info...</div>,
});
const InvestmentForm = dynamic(() => import("../InvestmentForm"), {
  ssr: false,
  loading: () => <div className="animate-pulse">Loading investment form...</div>,
});
const ContractDocument = dynamic(() => import("../ContractDocuments"), {
  ssr: false,
  loading: () => <div className="animate-pulse">Loading contract document...</div>,
});
import * as Yup from "yup";
import { useFormik } from "formik";
import { useParams, useRouter } from "next/navigation";
// import { generatePDF as GenerateSimplePDF } from "@/utils/pdfGenerator";
import { SignTeqIframe } from "@/components/SignTeqIframe";
import { SustainabilityStopPopup } from "@/components/popup";
import { TermsScreen } from "@/components/terms/TermsScreen";
import { FourMoneyInfo } from "@/components/terms/FourMoneyInfo";
import { FrootsCustomerInfo } from "@/components/terms/FrootsCustomerInfo";
import { SustainabilityRisksInfo } from "@/components/terms/SustainabilityRisksInfo";
// import { pdfBlobToBase64 } from "@/utils/pdfUtils";
// import { pdfBlobToBase64 } from "@/utils/pdfUtils";
import { CONFIG } from "@/config/constants";

/**
 * PHASE STRUCTURE (5 Main Phases):
 * 
 * Phase 1: Combined intro and initial questions
 *   - Sub-step: TERMS1 (4Money Information)
 *   - Sub-step: TERMS_FROOTS (froots Customer Information)
 *   - Sub-step: QUESTIONS1 (2 questions)
 *   - Sub-step: TERMS2 (Sustainability Risks)
 *   - Sub-step: QUESTIONS2 (13 questions)
 * 
 * Phase 2: SUGGESTIONS (Product recommendations)
 * Phase 3: CHAT (AI chatbot conversation)
 * Phase 4: PERSONAL_INFO (User details form)
 * 
 * Phase 5: Document signing and results
 *   - Sub-step: RESULT_PDF (SignTeq document signing and final result)
 */

const PHASES = {
  TERMS1: 1,
  TERMS_FROOTS: 1,
  QUESTIONS1: 1,
  TERMS2: 1,
  QUESTIONS2: 1,
  SUGGESTIONS: 2,
  CHAT: 3,
  PERSONAL_INFO: 4,
  INVESTMENT_FORM: 5,
  CONTRACT_DOCUMENT: 6,
  RESULT_PDF: 7,
};

type Portfolio = {
  id?: string;
  from: number;
  to: number;
  risk: string;
  name: string;
  fullName?: string;
  description?: string | null;
  fileName?: string | null;
  riskType?: string;
  aiSettings?: {
    id: string;
    model: string;
    prompt: string;
    vectorId: string | null;
  } | null;
  score?: number;
  sri?: string;
  duration?: number;
};

// Interface for answer with options
interface AnswerWithOptions {
  selectedOption: string;
  options: (Option | string)[];
}

const stepperBarClass = "flex-1 h-2 mx-1 rounded";
const stepperContainerClass =
  "w-full h-[100dvh] px-4 sm:px-6 lg:px-8 py-4 sm:py-6 bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col";
const cardClass =
  "flex-1 w-full max-w-7xl mx-auto bg-white rounded-lg sm:rounded-2xl shadow-lg sm:shadow-xl flex flex-col min-h-0";
const buttonBaseClass =
  "flex items-center justify-center gap-2 px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 rounded-lg font-medium sm:font-semibold text-sm sm:text-base transition-all duration-300 transform shadow-md hover:shadow-lg";
const buttonConfirmClass =
  "bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 active:scale-95";
const buttonConfirmedClass = "bg-green-500 text-white scale-95";
const buttonNextClass =
  "bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 active:scale-95";
const buttonBackClass =
  "border text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40";

// const riskMap: Record<string, string> = {
//   KONSERVATIV: 'Konservativ',
//   AUSGEWOGEN: 'Ausgewogen',
//   GEWINNORIENTIERT: 'Gewinnorientiert',
// };

const validationSchema = Yup.object({
  iban: Yup.string()
    .matches(/^([A-Z]{2}[0-9]{2}[A-Z0-9]{1,30})$/, "Ungültiges IBAN-Format")
    .required("IBAN ist erforderlich"),
  firstName: Yup.string()
    .min(2, "Vorname muss mindestens 2 Zeichen lang sein")
    .max(50, "Vorname darf maximal 50 Zeichen lang sein")
    .required("Vorname ist erforderlich"),

  lastName: Yup.string()
    .min(2, "Nachname muss mindestens 2 Zeichen lang sein")
    .max(50, "Nachname darf maximal 50 Zeichen lang sein")
    .required("Nachname ist erforderlich"),

  birthPlace: Yup.string()
    .min(2, "Geburtsort muss mindestens 2 Zeichen lang sein")
    .required("Geburtsort ist erforderlich"),

  birthCountry: Yup.string()
    .required("Geburtsland ist erforderlich"),

  nationality: Yup.string()
    .min(2, "Nationalität muss mindestens 2 Zeichen lang sein")
    .required("Nationalität ist erforderlich"),

  birthDate: Yup.date()
    .required("Geburtsdatum ist erforderlich")
    .max(new Date(), "Geburtsdatum darf nicht in der Zukunft liegen")
    .test("minAge", "Sie müssen mindestens 18 Jahre alt sein", (value) => {
      if (!value) return true;
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 18);
      return value <= cutoff;
    }),

  maritalStatus: Yup.string()
    .oneOf(
      ["Single", "Married", "Divorced", "Widowed"],
      "Ungültiger Familienstand"
    )
    .required("Familienstand ist erforderlich"),

  street: Yup.string()
    .min(2, "Straße muss mindestens 2 Zeichen lang sein")
    .required("Straße ist erforderlich"),

  houseNumber: Yup.string()
    .matches(/^[a-zA-Z0-9/-]{1,10}$/, "Ungültige Hausnummer")
    .required("Hausnummer ist erforderlich"),

  postalCode: Yup.string()
    .matches(/^\d{4,10}$/, "Postleitzahl muss 4 bis 10 Ziffern haben")
    .required("Postleitzahl ist erforderlich"),

  city: Yup.string()
    .min(2, "Stadt muss mindestens 2 Zeichen lang sein")
    .required("Stadt ist erforderlich"),

  countryCode: Yup.string()
    .matches(/^\+\d{1,4}$/, "Ländervorwahl muss mit + beginnen, gefolgt von 1-4 Ziffern")
    .required("Ländervorwahl ist erforderlich"),

  phone: Yup.string()
    .matches(
      /^\+?\d{7,15}$/,
      "Telefonnummer muss 7 bis 15 Ziffern haben, optional beginnend mit '+'"
    )
    .required("Telefonnummer ist erforderlich"),

  email: Yup.string()
    .email("Ungültiges E-Mail-Format")
    .required("E-Mail ist erforderlich"),

  education: Yup.string()
    .min(2, "Ausbildung muss mindestens 2 Zeichen lang sein")
    .required("Ausbildung ist erforderlich"),

  currentJob: Yup.string()
    .min(2, "Aktueller Beruf muss mindestens 2 Zeichen lang sein")
    .required("Aktueller Beruf ist erforderlich"),

  industry: Yup.string()
    .min(2, "Branche muss mindestens 2 Zeichen lang sein")
    .required("Branche ist erforderlich"),

  // occupation: Yup.string()
  //   .min(2, "Tätigkeit muss mindestens 2 Zeichen lang sein")
  //   .required("Tätigkeit ist erforderlich"),

  // documentType: Yup.string()
  //   .oneOf(
  //     ["passport", "identity_card", "drivers_license"],
  //     "Ungültige Dokumentenart"
  //   )
  //   .required("Dokumentenart ist erforderlich"),

  // documentNumber: Yup.string()
  //   .matches(
  //     /^[a-zA-Z0-9]{4,20}$/,
  //     "Dokumentnummer muss 4–20 alphanumerische Zeichen enthalten"
  //   )
  //   .required("Dokumentnummer ist erforderlich"),

  // issuingAuthority: Yup.string()
  //   .min(2, "Ausstellende Behörde muss mindestens 2 Zeichen lang sein")
  //   .required("Ausstellende Behörde ist erforderlich"),

  // issuedOn: Yup.date()
  //   .required("Ausstellungsdatum ist erforderlich")
  //   .max(new Date(), "Ausstellungsdatum darf nicht in der Zukunft liegen"),

  // validUntil: Yup.date()
  //   .min(Yup.ref("issuedOn"), "Gültig bis muss nach dem Ausstellungsdatum liegen")
  //   .required("Gültigkeitsdatum ist erforderlich"),

  country: Yup.string().required("Land ist erforderlich"),

  // bic: Yup.string()
  //   .matches(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, "Ungültiges BIC-Format")
  //   .required("BIC ist erforderlich"),

  bankName: Yup.string().required("Name der Bank ist erforderlich"),

  isTaxResidentAT: Yup.boolean()
    .required("Bitte geben Sie an, ob Sie in Österreich steueransässig sind"),
  // .nullable(),

  isTaxResidentOther: Yup.boolean()
    .required("Bitte geben Sie an, ob Sie in einem anderen Land steueransässig sind"),
  // .nullable(),

  isPEP: Yup.boolean()
    .required("Bitte geben Sie an, ob Sie eine PEP sind")
    .nullable(),

  taxResidencyCountry: Yup.string().when("isTaxResidentOther", {
    is: true,
    then: (schema) => schema.required("Steueransässigkeitsland ist erforderlich"),
    otherwise: (schema) => schema.nullable(),
  }),

  gender: Yup.string().required("Geschlecht ist erforderlich"),

  isSelfEmployed: Yup.boolean().nullable(),
});

// Constants for minimum investment values
const Q18_MIN_VALUE = 1500; // Minimum one-time investment (Question 18)
const Q19_MIN_VALUE = 75;   // Minimum monthly investment (Question 19)

export default function Stepper() {
  const [loading, setLoading] = useState(true);
  const [chatBtnLading, setChatBtnLanding] = useState(false);
  const [step, setStep] = useState(PHASES.TERMS1);
  const [currentSubStep, setCurrentSubStep] = useState<string>('TERMS1'); // Track sub-steps within Phase 1 and Phase 5
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  // const [answersByIndex, setAnswersByIndex] = useState<Record<number, AnswerWithOptions>>({});
  // console.log("🚀 ~ Stepper ~ answersByIndex:", answersByIndex)
  const [questionIndex, setQuestionIndex] = useState(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  // const [termsAndConditions, setTermsAndConditions] = useState<
  //   TermsAndConditions[]
  // >([]);
  const [suggestedProduct, setSuggestedProduct] = useState<Portfolio | null>(
    null
  );
  const params = useParams();
  const router = useRouter();
  const [threadId, setThreadId] = useState(null);
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  // const [finalPDFUrl, setFinalPDFUrl] = useState<string | null>(null);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  // const [signTeqRequestId, setSignTeqRequestId] = useState<string | null>(null);
  // console.log("🚀 ~ Stepper ~ signTeqRequestId:", signTeqRequestId)
  const [downloadedDocumentPath] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const session_id = params.session_id as string;
  const [isPepStop, setIsPepStop] = useState(false);
  const [isIncomeStop, setIsIncomeStop] = useState(false);
  const [isSustainabilityStop, setIsSustainabilityStop] = useState(false);
  const [highRiskCountries, setHighRiskCountries] = useState<string[]>([]);
  const questionSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchHighRiskCountries = async () => {
      try {
        const response = await fetch('/api/high-risk-countries');
        if (response.ok) {
          const data = await response.json();
          setHighRiskCountries(data.map((c: Record<string, string>) => c.name));
        }
      } catch (error) {
        console.error('Failed to fetch high-risk countries:', error);
      }
    };
    fetchHighRiskCountries();
  }, []);

  useEffect(() => {
    if (questionIndex) {
      console.log("questionIndex", questionIndex)
      questionSectionRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [questionIndex])

  const [investmentFormData, investmentSetFormData] = useState({
    liquidationRequired: false,
    timelyUmschichtung: false,
    allConfirmed: false,
    dataConsent: false,
    confirmationDeclaration: false,
    costsDisclosure: false,
    liquidityNeeds: false,
    additionalLiquidityNeeds: false
  });

  const handleCheckboxChange = (field: keyof typeof investmentFormData) => {
    investmentSetFormData(prev => {
      const updated = {
        ...prev,
        [field]: !prev[field]
      };

      // If updating allConfirmed, toggle all other fields
      if (field === 'allConfirmed') {
        const newValue = !prev.allConfirmed;
        return {
          ...updated,
          dataConsent: newValue,
          confirmationDeclaration: newValue,
          costsDisclosure: newValue,
          liquidityNeeds: newValue,
          additionalLiquidityNeeds: newValue,
          // liquidationRequired: newValue,
          // timelyUmschichtung: newValue,
          allConfirmed: newValue
        };
      }

      // Check if all individual checkboxes are now checked
      const allChecked =
        // updated.liquidationRequired &&
        // updated.timelyUmschichtung &&
        updated.dataConsent &&
        updated.confirmationDeclaration &&
        updated.costsDisclosure &&
        updated.liquidityNeeds &&
        updated.additionalLiquidityNeeds;

      // Update allConfirmed if all individual boxes are checked
      if (allChecked) {
        updated.allConfirmed = true;
      } else if (updated.allConfirmed) {
        // Uncheck allConfirmed if we're unchecking an individual box
        updated.allConfirmed = false;
      }

      return updated;
    });
  };

  const [expandedSections, setExpandedSections] = useState({
    vertraege: false,
    weitereInfo: false
  });

  const [agreements, setAgreements] = useState({
    acceptAll: false,
    dataProtection: false,
    vermoegensverwaltung: false,
    bankenbedingungen: false,
    widerruf: false,
    efsaeg: false,
    informationen: false,
    auftraggeber: false,
    einverstanden: false,
    disclaimer: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => {
      const isCurrentlyOpen = prev[section];
      return {
        vertraege: false,
        weitereInfo: false,
        [section]: !isCurrentlyOpen
      };
    });
  };

  const handleCheckboxChangeContractDocument = (field: keyof typeof agreements) => {
    setAgreements(prev => {
      const updated = {
        ...prev,
        [field]: !prev[field]
      };

      // Check if all individual checkboxes are now checked
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

      // Update acceptAll if all individual boxes are checked
      if (allChecked) {
        updated.acceptAll = true;
      } else if (updated.acceptAll && field !== 'acceptAll') {
        // Uncheck acceptAll if we're unchecking an individual box
        updated.acceptAll = false;
      }

      return updated;
    });
  };

  const handleAcceptAll = () => {
    const newValue = !agreements.acceptAll;
    setAgreements({
      acceptAll: newValue,
      dataProtection: newValue,
      vermoegensverwaltung: newValue,
      bankenbedingungen: newValue,
      widerruf: newValue,
      efsaeg: newValue,
      informationen: newValue,
      auftraggeber: newValue,
      einverstanden: newValue,
      disclaimer: newValue
    });
  };

  // Pagination for question pages (show multiple questions per view)
  const QUESTIONS_PER_PAGE = 3; // adjust this number to show more/less questions per page

  // For PHASES.QUESTIONS1 (first 2 questions remain grouped)
  const questions1 = questions.slice(0, 2);
  const totalQuestions1 = questions1.length;
  const totalPages1 = Math.max(1, Math.ceil(totalQuestions1 / QUESTIONS_PER_PAGE));


  // Helper to check visibility
  const isQuestionVisible = (q: Question): boolean => {
    if (!q.showIf) return true;

    const { questionOrder, condition, value } = q.showIf;
    // Find the question that this one depends on
    const dependencyQ = questions.find(curr => curr.questionOrder === questionOrder);
    if (!dependencyQ) return true;

    // RECURSIVE CHECK: If dependency is not visible, this question is also not visible
    if (!isQuestionVisible(dependencyQ)) return false;

    const answer = answers[dependencyQ.id];
    // If parent not answered, hide child
    if (!answer) return false;

    const normalizedAnswer = answer.toLowerCase();
    const normalizedValue = value.toLowerCase();

    // Check for 'none' equivalents
    if (normalizedValue === 'none') {
      const isNone = normalizedAnswer === 'none' || normalizedAnswer === 'keine';
      if (condition === 'notEquals') return !isNone;
      if (condition === 'equals') return isNone;
    }

    // Check for 'yes' equivalents
    if (normalizedValue === 'yes') {
      const isYes = normalizedAnswer === 'yes' || normalizedAnswer === 'ja';
      if (condition === 'equals') return isYes;
      if (condition === 'notEquals') return !isYes;
    }

    if (condition === 'equals') return normalizedAnswer === normalizedValue;
    if (condition === 'notEquals') return normalizedAnswer !== normalizedValue;

    return true;
  };

  // For PHASES.QUESTIONS2 (remaining questions)
  const questionsPhase2Raw = questions.slice(2);
  const questions2 = questionsPhase2Raw.filter(isQuestionVisible);
  const totalQuestions2 = questions2.length;
  const totalPages2 = Math.max(1, Math.ceil(totalQuestions2 / QUESTIONS_PER_PAGE));

  // questionIndex now works as a page index within the current sub-step (1-based)
  const currentPage = Math.max(1, questionIndex);

  // Determine which questions should be visible on the current page
  // Compute a balanced page slice so the final page doesn't contain a single orphan question.
  const getPageSlice = (arr: Question[], page: number, perPage: number) => {
    const N = arr.length;
    const totalPages = Math.max(1, Math.ceil(N / perPage));

    // default start/end (end exclusive)
    let start = (page - 1) * perPage;
    let end = page * perPage;

    // If the last page would contain just 1 item (remainder === 1) and there is more than one page,
    // rebalance so the last two pages contain at least 2 items each by shifting one item from the
    // penultimate page to the last page.
    if (N % perPage === 1 && totalPages > 1) {
      if (page === totalPages - 1) {
        // penultimate page: show one less item
        end = end - 1;
      } else if (page === totalPages) {
        // last page: start one item earlier to include the shifted item
        start = Math.max(0, start - 1);
      }
    }

    start = Math.max(0, start);
    end = Math.min(N, end);

    return arr.slice(start, end);
  };

  const currentPageQuestions =
    currentSubStep === 'QUESTIONS1'
      ? getPageSlice(questions1, currentPage, QUESTIONS_PER_PAGE)
      : getPageSlice(questions2, currentPage, QUESTIONS_PER_PAGE);

  // Convenience: (legacy single-question refs removed; use currentPageQuestions)

  const isAnswerProvided = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

  // Helper to check if the current page is fully answered and valid
  // Special case: Q18 + Q19 -> at least one of them must be filled (either can be empty)
  const pageQ18 = currentPageQuestions.find(q => q.questionOrder === 18);
  const pageQ19 = currentPageQuestions.find(q => q.questionOrder === 19);
  const hasQ18AndQ19OnPage = !!pageQ18 && !!pageQ19;
  const hasEitherQ18OrQ19Answer = hasQ18AndQ19OnPage
    ? (isAnswerProvided(answers[pageQ18!.id]) || isAnswerProvided(answers[pageQ19!.id]))
    : false;

  const isCurrentPageValid = currentPageQuestions.length > 0 && currentPageQuestions.every((q) => {
    const answer = answers[q.id];
    const provided = isAnswerProvided(answer);

    if (q.questionOrder === 18 || q.questionOrder === 19) {
      // Both Q18 and Q19 are optional individually, but at least one must be filled overall
      // This check happens at the page level - if both are on the page, at least one must be filled
      if (hasQ18AndQ19OnPage) {
        if (!hasEitherQ18OrQ19Answer) return false;
        // If one of them is provided, the other may be empty
        if (!provided) return true;
      } else {
        // If only one is on the page, it's optional (can be empty)
        // The global check will ensure at least one is filled before proceeding
        if (!provided) return true;
      }
    } else {
      if (!provided) return false;
    }

    if (provided && hasValidationError(q, answer)) return false;
    return true;
  });

  // Mapping of parent questions to their dependent child questions
  // When parent answer is NOT 'good', the child question should be reset
  const dependentQuestionsMap: Record<number, number> = {
    12: 12.1,  // Question 12 -> 12.1
    13: 13.1,  // Question 13 -> 13.1
    14: 14.1,  // Question 14 -> 14.1
  };

  // Handler for selecting an option for any question on a page
  const handleSelectQuestion = async (q: Question, opt: string) => {
    try {
      // Update local state immediately
      const newAnswers = { ...answers, [q.id]: opt };
      setAnswers(newAnswers);

      // Sync index-based structure used elsewhere
      syncAnswers(q.id, opt, q.questionOrder, q.options || []);

      // Persist the answer
      await saveAnswer(q.id, opt, q.text, q.questionType, q.options);

      // Check if this is a parent question with a dependent child question
      const childQuestionOrder = dependentQuestionsMap[q.questionOrder];
      if (childQuestionOrder !== undefined && opt !== 'good') {
        // Find the child question and reset its answer
        const childQuestion = questions.find(cq => cq.questionOrder === childQuestionOrder);
        if (childQuestion) {
          // Clear the child question's answer in local state
          const clearedAnswers = { ...newAnswers };
          delete clearedAnswers[childQuestion.id];
          setAnswers(clearedAnswers);

          // Sync the cleared answer
          syncAnswers(childQuestion.id, '', childQuestionOrder, childQuestion.options || []);

          // Persist the cleared answer to the database
          await saveAnswer(childQuestion.id, '', childQuestion.text, childQuestion.questionType, childQuestion.options);
        }
      }

      // Do not auto-advance — allow user to answer all visible questions and use Next
      // Page validity is handled by `isCurrentPageValid` which controls the Next button
    } catch (err) {
      console.error('Error saving answer:', err);
    }
  };

  const formik = useFormik({
    initialValues: {
      firstName: "",
      lastName: "",
      birthPlace: "",
      birthCountry: "",
      nationality: "",
      birthDate: "",
      maritalStatus: "",
      street: "",
      houseNumber: "",
      postalCode: "",
      city: "",
      countryCode: "+43",
      phone: "",
      email: (typeof window !== "undefined" && window.localStorage.getItem("userEmail")) || "",
      iban: "",
      education: "",
      currentJob: "",
      industry: "",
      occupation: "",
      documentType: "",
      documentNumber: "",
      issuingAuthority: "",
      issuedOn: "",
      validUntil: "",
      isPEP: null,
      residenceAbroad: false,
      actingFor: "",
      magicFlow: process.env.NEXT_PUBLIC_ENV === 'development' ? true : false,
      country: "",
      bic: "",
      bankName: "",
      isTaxResidentAT: null,
      isTaxResidentOther: null,
      gender: "",
      isSelfEmployed: false,
      taxResidencyCountry: ""
    },
    validationSchema,
    onSubmit: (values: PersonalInfoFormData) => {
      onPersonalInfoSubmit(values);
    },
  });

  const handleConfirm = async () => {
    setConfirmed(true);
    // await saveUpdatedTermsStatus(); // Call API to save acceptance

    setTimeout(() => {
      setConfirmed(false);

      // Navigate within Phase 1 sub-steps
      if (currentSubStep === 'TERMS1') {
        setCurrentSubStep('TERMS_FROOTS');
        setQuestionIndex(1);
        savePhase(1, 'TERMS_FROOTS');
      } else if (currentSubStep === 'TERMS_FROOTS') {
        setCurrentSubStep('QUESTIONS1');
        setQuestionIndex(1);
        savePhase(1, 'QUESTIONS1');
      } else if (currentSubStep === 'TERMS2') {
        setCurrentSubStep('QUESTIONS2');
        setQuestionIndex(1);
        savePhase(1, 'QUESTIONS2');
      }
    }, 2000);
  };

  // Helper function to save the current phase to the database
  const savePhase = async (newStep: number, subStep?: string) => {
    try {
      // For Phase 1 and Phase 7, save the actual sub-step name
      let phaseName: string | undefined;

      if ((newStep === 1 || newStep === 7) && subStep) {
        phaseName = subStep;
      } else {
        // Convert step number back to phase name for other phases
        phaseName = Object.keys(PHASES).find(key => {
          const phaseValue = PHASES[key as keyof typeof PHASES];
          return phaseValue === newStep &&
            key !== 'TERMS1' && key !== 'TERMS_FROOTS' && key !== 'QUESTIONS1' && key !== 'TERMS2' && key !== 'QUESTIONS2' &&
            key !== 'RESULT_PDF';
        });
      }

      if (phaseName && session_id) {
        await fetch("/api/phase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session_id,
            phase: phaseName
          }),
        });
      }
    } catch (error) {
      console.error("Failed to save phase:", error);
    }
  };

  const nextStep = () => {
    // Handle Phase 1 sub-steps navigation
    if (step === 1) {
      // If we're at the last page of QUESTIONS1, move to TERMS2
      if (currentSubStep === 'QUESTIONS1' && (questionIndex * QUESTIONS_PER_PAGE) >= totalQuestions1) {
        setCurrentSubStep('TERMS2');
        setQuestionIndex(1);
        savePhase(1, 'TERMS2');
        return;
      }

      // If we're at the last page of QUESTIONS2, move to SUGGESTIONS (Phase 2)
      if (currentSubStep === 'QUESTIONS2' && (questionIndex * QUESTIONS_PER_PAGE) >= totalQuestions2) {
        const newStep = PHASES.SUGGESTIONS;
        setStep(newStep);
        setCurrentSubStep('');
        savePhase(newStep);
        return;
      }
    }

    // Handle Phase 4 (PERSONAL_INFO) to Phase 5 (INVESTMENT_FORM) navigation
    if (step === 4) {
      // Moving from Phase 4 (PERSONAL_INFO) to Phase 5 (INVESTMENT_FORM)
      setStep(5);
      setCurrentSubStep('');
      savePhase(5);
      return;
    }

    // Handle Phase 5 (INVESTMENT_FORM) to Phase 6 (CONTRACT_DOCUMENT) navigation
    if (step === 5) {
      // Moving from Phase 5 (INVESTMENT_FORM) to Phase 6 (CONTRACT_DOCUMENT)
      setStep(6);
      setCurrentSubStep('');
      savePhase(6);
      return;
    }

    // Handle Phase 6 (CONTRACT_DOCUMENT) to Phase 7 (RESULT_PDF) navigation
    if (step === 6) {
      // Moving from Phase 6 (CONTRACT_DOCUMENT) to Phase 7 (RESULT_PDF)
      setStep(7);
      setCurrentSubStep('RESULT_PDF');
      savePhase(7, 'RESULT_PDF');

      // Create SignTeq signing session on entry
      if (!signingUrl) {
        void generatePDF();
      }
      return;
    }

    const newStep = Math.min(step + 1, 7);
    setStep(newStep);
    setCurrentSubStep('');
    savePhase(newStep);
  };

  const prevStep = () => {
    // Handle Phase 1 sub-steps navigation
    if (step === 1) {
      if (currentSubStep === 'QUESTIONS1' && questionIndex === 1) {
        setCurrentSubStep('TERMS_FROOTS');
        savePhase(1, 'TERMS_FROOTS');
        return;
      } else if (currentSubStep === 'TERMS_FROOTS') {
        setCurrentSubStep('TERMS1');
        savePhase(1, 'TERMS1');
        return;
      } else if (currentSubStep === 'TERMS2') {
        setCurrentSubStep('QUESTIONS1');
        setQuestionIndex(totalPages1);
        savePhase(1, 'QUESTIONS1');
        return;
      } else if (currentSubStep === 'QUESTIONS2' && questionIndex === 1) {
        setCurrentSubStep('TERMS2');
        savePhase(1, 'TERMS2');
        return;
      }
    }

    // Handle Phase 5 (INVESTMENT_FORM) to Phase 4 (PERSONAL_INFO) navigation
    if (step === 5) {
      // Going back from Phase 5 (INVESTMENT_FORM) to Phase 4 (PERSONAL_INFO)
      setStep(4);
      setCurrentSubStep('');
      savePhase(4);
      return;
    }

    // Handle Phase 6 (CONTRACT_DOCUMENT) to Phase 5 (INVESTMENT_FORM) navigation
    if (step === 6) {
      // Going back from Phase 6 (CONTRACT_DOCUMENT) to Phase 5 (INVESTMENT_FORM)
      setStep(5);
      setCurrentSubStep('');
      savePhase(5);
      return;
    }

    // Handle Phase 7 navigation (single sub-step)
    if (step === 7) {
      // Going back from Phase 7 to Phase 6
      setStep(6);
      setCurrentSubStep('');
      savePhase(6);
      return;
    }

    if (step === PHASES.SUGGESTIONS) {
      // Going back from Phase 2 to Phase 1
      setStep(1);
      setCurrentSubStep('QUESTIONS2');
      setQuestionIndex(totalPages2);
      savePhase(1, 'QUESTIONS2');
      return;
    }

    const newStep = Math.max(step - 1, 1);
    setStep(newStep);

    // Reset to beginning of Phase 1 if going back to it
    if (newStep === 1) {
      setCurrentSubStep('TERMS1');
      savePhase(1, 'TERMS1');
    } else {
      setCurrentSubStep('');
      savePhase(newStep);
    }
  };

  const backDashboard = async () => {
    // Logic to navigate back to the dashboard
    setLoading(true);
    try {
      await fetch("/api/user/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: session_id }),
      });
    } catch (err) {
      console.error("Failed to update user status", err);
    } finally {
      setLoading(false);
    }
    router.push("/customer/dashboard");
  };

  const lastQuestionNext = () => {
    // This function is called when finishing questions in a sub-step
    if (currentSubStep === 'QUESTIONS1') {
      setCurrentSubStep('TERMS2');
      setQuestionIndex(1);
      savePhase(1, 'TERMS2');
    } else if (currentSubStep === 'QUESTIONS2') {
      // Check that at least one of Q18 (one-time investment) or Q19 (monthly investment) is filled
      const q18 = questions.find(q => q.questionOrder === 18);
      const q19 = questions.find(q => q.questionOrder === 19);
      const hasQ18Answer = q18 && isAnswerProvided(answers[q18.id]);
      const hasQ19Answer = q19 && isAnswerProvided(answers[q19.id]);
      
      if (!hasQ18Answer && !hasQ19Answer) {
        // At least one investment question must be answered
        alert("Bitte geben Sie entweder eine Einmalanlage (Frage 18) oder eine monatliche Anlage (Frage 19) an. Mindestens eine von beiden muss ausgefüllt werden.");
        return;
      }
      
      // Clear any previous errors
      setError(null);
      
      // Move to Phase 2 (SUGGESTIONS)
      setStep(PHASES.SUGGESTIONS);
      setCurrentSubStep('');
      setQuestionIndex(1);
      savePhase(PHASES.SUGGESTIONS);
    }
  };

  // Helper function to sync answers by ID and by index
  const syncAnswers = (questionId: string, selectedOption: string, index: number, options: (Option | string)[]) => {
    console.log("🚀 ~ syncAnswers ~ options:", options)
    console.log("🚀 ~ syncAnswers ~ index:", index)
    setAnswers(prev => ({ ...prev, [questionId]: selectedOption }));
    // setAnswersByIndex(prev => ({
    //   ...prev,
    //   [index]: {
    //     selectedOption,
    //     options
    //   }
    // }));
  };

  // Helper function to get available income (income - expenses)
  function getAvailableIncome(): number {
    const incomeQ = questions[5]; // Q6 - income
    const expensesQ = questions[6]; // Q7 - expenses
    const incomeVal = incomeQ && answers[incomeQ.id] ? parseFloat(answers[incomeQ.id]) : 0;
    const expensesVal = expensesQ && answers[expensesQ.id] ? parseFloat(answers[expensesQ.id]) : 0;
    return incomeVal - expensesVal;
  }

  // Helper function to get total net assets (Q8)
  function getTotalNetAssets(): number {
    const netAssetsQ = questions[7]; // Q8 - total net assets
    const netAssetsVal = netAssetsQ && answers[netAssetsQ.id] ? parseFloat(answers[netAssetsQ.id]) : 0;
    return netAssetsVal;
  }

  // Helper function to check if one-time investment (Q18) has errors
  function hasOneTimeInvestmentError(q: Question | undefined, answerValue: string | undefined): boolean {
    if (!q || !answerValue || q.questionOrder !== 18) return false;

    const numValue = parseFloat(answerValue);
    if (isNaN(numValue)) return false;

    // Check minimum value
    if (numValue < Q18_MIN_VALUE) return true;

    // Check against total net assets (Q8)
    const totalNetAssets = getTotalNetAssets();
    return numValue > totalNetAssets;
  }

  // Get error message for one-time investment validation
  function getOneTimeInvestmentErrorMessage(q: Question | undefined, answerValue: string | undefined): string | undefined {
    if (!q || !answerValue || q.questionOrder !== 18) return undefined;

    const numValue = parseFloat(answerValue);
    if (isNaN(numValue)) return undefined;

    // Check minimum value first
    if (numValue < Q18_MIN_VALUE) {
      return `Der Mindestbetrag für eine Einmalanlage beträgt ${Q18_MIN_VALUE.toLocaleString('de-DE')} €.`;
    }

    // Check against total net assets
    const totalNetAssets = getTotalNetAssets();
    if (numValue > totalNetAssets) {
      return `Der Einmalanlagebetrag darf nicht höher als Ihr Nettogesamtvermögen (${totalNetAssets.toFixed(2)} €) sein.`;
    }

    return undefined;
  }

  // Helper function to check if monthly investment (Q19) has errors
  function hasMonthlyInvestmentError(q: Question | undefined, answerValue: string | undefined): boolean {
    if (!q || !answerValue || q.questionOrder !== 19) return false;

    const numValue = parseFloat(answerValue);
    if (isNaN(numValue)) return false;

    // Check minimum value
    if (numValue < Q19_MIN_VALUE) return true;

    // Check against available income (income - expenses)
    const availableIncome = getAvailableIncome();
    return numValue >= availableIncome;
  }

  // Get error message for monthly investment validation
  function getMonthlyInvestmentErrorMessage(q: Question | undefined, answerValue: string | undefined): string | undefined {
    if (!q || !answerValue || q.questionOrder !== 19) return undefined;

    const numValue = parseFloat(answerValue);
    if (isNaN(numValue)) return undefined;

    // Check minimum value first
    if (numValue < Q19_MIN_VALUE) {
      return `Der Mindestbetrag für eine monatliche Anlage beträgt ${Q19_MIN_VALUE} €.`;
    }

    // Check against available income
    const availableIncome = getAvailableIncome();
    if (numValue >= availableIncome) {
      return `Der monatliche Anlagebetrag darf nicht höher als oder gleich Ihrem verfügbaren Einkommen (${availableIncome.toFixed(2)} €) sein.`;
    }

    return undefined;
  }

  // Helper function to check if a number input violates min/max constraints
  function hasValidationError(q: Question | undefined, answerValue: string | undefined): boolean {
    // console.log("🚀 ~ hasValidationError ~ q, answerValue:", q, answerValue);
    if (!q || !answerValue || q.questionType !== 'number') return false;

    const numValue = parseInt(answerValue, 10);
    if (isNaN(numValue)) return false;

    if (q.minValue !== null && q.minValue !== undefined && numValue < q.minValue) return true;
    if (q.maxValue !== null && q.maxValue !== undefined && numValue > q.maxValue) return true;

    // Check Q18 (one-time investment) against Q8 (total net assets)
    if (q.questionOrder === 18) {
      if (hasOneTimeInvestmentError(q, answerValue)) return true;
    }

    // Check Q19 (monthly investment) against (income - expenses)
    if (q.questionOrder === 19) {
      if (hasMonthlyInvestmentError(q, answerValue)) return true;
    }

    return false;
  }

  // Helper to check forbidden values for specific questions (e.g., Q9 & Q10)
  // function hasForbiddenSelection(q: Question | undefined, answerValue: string | undefined): boolean {
  //   if (!q || !answerValue) return false;
  //   // For questions 9 and 10, forbid 'none' or 'keine'
  //   if (q.questionOrder === 9 || q.questionOrder === 10) {
  //     const val = answerValue.toLowerCase();
  //     return val === 'none' || val === 'keine';
  //   }

  //   return false;
  // }

  const sendMessage = useCallback(
    async (messageOverride: string = "", shouldAppend: boolean = true) => {
      const messageToSend =
        messageOverride.length > 0 ? messageOverride : input.trim();
      if (!messageToSend || loading) return;

      const userMessage: Message = {
        role: Role.customer,
        content: messageToSend,
        timestamp: new Date(),
      };
      if (shouldAppend) {
        setMessages((prev) => [...prev, userMessage]);
      }
      setInput("");
      setChatBtnLanding(true);

      try {
        const response = await fetch("/api/phase/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: userMessage.content,
            sessionId: session_id,
            threadId,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to get response");
        }

        // Create a placeholder bot message for streaming
        const botMessage: Message = {
          role: Role.assistant,
          content: "",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMessage]);

        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        if (reader) {
          setChatBtnLanding(false);
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ""; // Keep incomplete line in buffer

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));

                  if (data.done) {
                    // Final response with metadata
                    if (data.threadId && !threadId) {
                      setThreadId(data.threadId);
                    }
                    break;
                  } else if (data.content) {
                    // Update the last message with new content
                    setMessages((prev) => {
                      // IMPORTANT: keep this update immutable.
                      // Mutating `lastMessage` can cause duplicated text in React 18 Strict Mode
                      // because updater functions may be invoked more than once in dev.
                      for (let i = prev.length - 1; i >= 0; i--) {
                        const msg = prev[i];
                        if (msg?.role === Role.assistant) {
                          const next = prev.slice();
                          next[i] = { ...msg, content: (msg.content ?? '') + data.content };
                          return next;
                        }
                      }
                      return prev;
                    });
                  }
                } catch (e) {
                  console.error("Error parsing streaming data:", e);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error:", error);
        const errorMessage: Message = {
          role: Role.assistant,
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setChatBtnLanding(false);
      }
    },
    [loading, session_id, threadId, input]
  );

  // Callback to refresh messages after audio is processed on the server
  const handleAudioProcessed = useCallback(async () => {
    try {
      // Fetch the latest messages from the server
      const response = await fetch(`/api/phase/chat?threadId=${threadId}&sessionId=${session_id}`);
      if (response.ok) {
        const data = await response.json();
        if (data.messages && Array.isArray(data.messages)) {
          // Update messages with proper timestamps
          const updatedMessages = data.messages.map((msg: Message) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }));
          setMessages(updatedMessages);
        }
      }
    } catch (error) {
      console.error('Error refreshing messages after audio processing:', error);
    }
  }, [threadId, session_id]);

  const suggestProduct = async (
    duration: string,
    risk: string
  ): Promise<Portfolio | null> => {
    try {
      // console.log("🔍 Requesting product suggestion:", { duration, risk });

      const response = await fetch(
        `/api/phase/product?duration=${duration}&risk=${risk}`,
        {
          method: "GET",
        }
      );

      const data = await response.json();
      // console.log("🎯 Product suggestion response:", data);

      if (data.success && data.data) {
        return data.data;
      } else {
        console.warn("No product found for criteria:", { duration, risk });
        return null;
      }
    } catch (error) {
      console.error("Error fetching product suggestion:", error);
      return null;
    }
  };

  // Function to initialize chat with automatic AI message
  const initializeChatWithProduct = useCallback(
    async (productId: string) => {
      try {
        // console.log("🤖 Initializing chat for product:", productId);

        const response = await fetch("/api/phase/chat/init", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId: session_id,
            productId: productId,
          }),
        });

        const data = await response.json();

        if (data.success) {
          // console.log("✅ Chat initialized successfully:", data.message);

          // Update thread ID if provided
          if (data.threadId && !threadId) {
            setThreadId(data.threadId);
          }

          const effectiveThreadId = data.threadId || threadId;

          // If chat already has messages (e.g. after reload), don't render the status string.
          // Instead, fetch and display existing messages.
          if (data.alreadyInitialized || data.message === 'Chat already initialized') {
            if (effectiveThreadId) {
              try {
                const existingResponse = await fetch(
                  `/api/phase/chat?threadId=${effectiveThreadId}&sessionId=${session_id}`
                );
                if (existingResponse.ok) {
                  const existingData = await existingResponse.json();
                  if (existingData.messages && Array.isArray(existingData.messages)) {
                    const updatedMessages = existingData.messages.map((msg: Message) => ({
                      ...msg,
                      timestamp: new Date(msg.timestamp)
                    }));
                    setMessages(updatedMessages);
                  }
                }
              } catch (error) {
                console.error('Error fetching existing chat messages after init:', error);
              }
            }
            return true;
          }

          // Add the welcome message to the UI
          const welcomeMessage: Message = {
            role: Role.assistant,
            content: data.message,
            timestamp: new Date(),
          };

          setMessages([welcomeMessage]);

          return true;
        } else {
          console.error("Failed to initialize chat:", data.error);
          return false;
        }
      } catch (error) {
        console.error("Error initializing chat:", error);
        return false;
      }
    },
    [session_id, threadId]
  );


  // Fetch saved product suggestion on load
  useEffect(() => {
    const fetchSavedProduct = async () => {
      if (!session_id) return;

      try {
        const response = await fetch(`/api/phase/suggest-product?qaSessionId=${session_id}`);
        const data = await response.json();

        if (data.success && data.data) {
          setSuggestedProduct(data.data);
          // Also initialize chat if product is found
          if (data.data.id) {
            await initializeChatWithProduct(data.data.id);
          }
        }
      } catch (error) {
        console.error("Failed to fetch saved product suggestion:", error);
      }
    };

    fetchSavedProduct();
  }, [session_id, initializeChatWithProduct]);

  useEffect(() => {
    const fetchSuggestedProduct = async () => {
      if (step === PHASES.SUGGESTIONS && questions.length > 0) {
        try {
          setLoading(true);
          const durationQuestionId = questions[1]?.id;
          const riskQuestionId = questions[4]?.id;

          if (
            durationQuestionId &&
            riskQuestionId &&
            answers[durationQuestionId] &&
            answers[riskQuestionId]
          ) {
            const product = await suggestProduct(
              answers[durationQuestionId],
              answers[riskQuestionId]
            );
            setSuggestedProduct(product);

            // Save the product suggestion to the session
            if (product?.id) {
              try {
                await fetch("/api/phase/suggest-product", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    qaSessionId: session_id,
                    productId: product.id,
                    name: product.name,
                    shortName: product.name,
                    description: product.description,
                    fileName: product.fileName,
                    suggestionReason: `Selected based on ${answers[durationQuestionId]} duration and ${answers[riskQuestionId]} risk preference`,
                    confidenceScore: product.score
                      ? (product.score / 100).toFixed(2)
                      : null,
                    isConfirmed: false,
                  }),
                });

                // Automatically initialize chat with the selected product
                // console.log(
                //   "🤖 Auto-initializing chat for selected product:",
                //   product.name
                // );
                await initializeChatWithProduct(product.id);
              } catch (saveError) {
                console.error("Failed to save product suggestion:", saveError);
                // Still try to initialize chat even if saving fails
                await initializeChatWithProduct(product.id);
              }
            }
          } else {
            // console.warn("⚠️ Missing required answers for product suggestion", {
            //   hasDurationId: !!durationQuestionId,
            //   hasRiskId: !!riskQuestionId,
            //   hasDurationAnswer: durationQuestionId
            //     ? !!answers[durationQuestionId]
            //     : false,
            //   hasRiskAnswer: riskQuestionId ? !!answers[riskQuestionId] : false,
            // });
          }
        } catch (error) {
          console.error("❌ Failed to fetch product suggestion:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchSuggestedProduct();
  }, [step, answers, session_id, questions, initializeChatWithProduct]);

  useEffect(() => {
    const loadChatHistory = async () => {
      if (step === PHASES.CHAT) {
        if (!session_id && !threadId) return;

        try {
          const response = await fetch(
            `/api/phase/chat?threadId=${threadId}&sessionId=${session_id}`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.messages?.length > 0) {
              setMessages(
                data.messages.map((msg: Message) => ({
                  ...msg,
                  timestamp: new Date(msg.timestamp),
                }))
              );
            } else {
              // If no messages exist, try to initialize chat with the selected product
              if (suggestedProduct?.id) {
                await initializeChatWithProduct(suggestedProduct.id);
              } else {
                // Fallback message if no product is selected
                const fallbackMessage: Message = {
                  role: Role.assistant,
                  content:
                    "Willkommen! Ich bin Ihr persönlicher Finanzberater und helfe Ihnen gerne bei all Ihren Fragen.",
                  timestamp: new Date(),
                };
                setMessages([fallbackMessage]);
              }
            }
          }
        } catch (error) {
          console.error("Error loading chat history:", error);
        }
      }
    };
    loadChatHistory();
  }, [
    sendMessage,
    session_id,
    step,
    threadId,
    suggestedProduct?.id,
    initializeChatWithProduct,
  ]);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/phase?id=" + session_id, {
          method: "GET",
        });
        const data = await res.json();
        // console.log("🚀 ~ fetchQuestions ~ data:", data)
        if (data.success) {
          const sortedQuestions = data.questions.sort((a: Question, b: Question) => a.questionOrder - b.questionOrder);

          // Apply showIf logic
          const questionsWithLogic = sortedQuestions.map((q: Question) => {
            // const rules: Record<number, Record<string, string | number>> = {
            //   13: { questionOrder: 12, condition: 'notEquals', value: 'none' },
            //   14: { questionOrder: 13, condition: 'equals', value: 'yes' },
            //   16: { questionOrder: 15, condition: 'notEquals', value: 'none' },
            //   17: { questionOrder: 16, condition: 'equals', value: 'yes' },
            //   19: { questionOrder: 18, condition: 'notEquals', value: 'none' },
            //   20: { questionOrder: 19, condition: 'equals', value: 'yes' },
            // };
            const rules: Record<number, Record<string, string | number>> = {
              12.1: { questionOrder: 12, condition: 'equals', value: 'good' },
              13.1: { questionOrder: 13, condition: 'equals', value: 'good' },
              14.1: { questionOrder: 14, condition: 'equals', value: 'good' },
            };
            if (rules[q.questionOrder]) {
              return { ...q, showIf: rules[q.questionOrder] };
            }
            return q;
          });

          setQuestions(questionsWithLogic);
          setAnswers(data.answers || {});

          // Build answersByIndex from answers and questions
          if (data.answers && data.questions) {
            const indexedAnswers: Record<number, AnswerWithOptions> = {};
            data.questions.forEach((question: Question) => {
              if (data.answers[question.id]) {
                indexedAnswers[question.questionOrder] = {
                  selectedOption: data.answers[question.id],
                  options: question.options || [],
                };
              }
            });
            // setAnswersByIndex(indexedAnswers);
          }

          // Set the step to the saved phase from the session
          // NOTE: SIGN_DOCUMENT is deprecated; map it forward to RESULT_PDF.
          const normalizedPhase = data.currentPhase === 'SIGN_DOCUMENT' ? 'RESULT_PDF' : data.currentPhase;
          if (normalizedPhase && PHASES[normalizedPhase as keyof typeof PHASES] && data.sessionStatus == SessionStatus.DRAFT) {
            const phaseStep = PHASES[normalizedPhase as keyof typeof PHASES];
            setStep(phaseStep);

            // Set the appropriate sub-step for Phase 1
            if (phaseStep === 1) {
              if (normalizedPhase === 'TERMS1' || normalizedPhase === 'TERMS_FROOTS' || normalizedPhase === 'QUESTIONS1' || normalizedPhase === 'TERMS2' || normalizedPhase === 'QUESTIONS2') {
                setCurrentSubStep(normalizedPhase);
              } else {
                setCurrentSubStep('TERMS1'); // Default to first sub-step
              }
            }
            // Set the appropriate sub-step for Phase 7
            else if (phaseStep === 7) {
              setCurrentSubStep('RESULT_PDF');
            }
            // For other phases (5, 6), clear sub-step
            else {
              setCurrentSubStep('');
            }
          } else {
            setStep(PHASES.TERMS1);
            setCurrentSubStep('TERMS1');
          }
        } else {
          router.push("/customer/signin");
        }
      } catch (error) {
        console.error("Fetch questions error:", error);
      } finally {
        setLoading(false);
      }
    };
    const threadCreate = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/phase/chat/thread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qaSessionId: session_id }),
        });

        const data = await res.json();
        if (data?.success) {
          setThreadId(data?.session.id);
        } else {
          // handle error
        }
      } catch (error) {
        console.log("🚀 ~ threadCreate ~ error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
    threadCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session_id]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch("/api/user/info/" + session_id, {
          method: "GET",
        });
        const data = await response.json();
        if (data?.success) {
          const user = data.user;
          console.log("🚀 ~ fetchUserInfo ~ user:", user)
          // Set formik values if user details are available
          if (user) {
            formik.setValues({
              firstName: user.firstName || "",
              lastName: user.lastName || "",
              birthPlace: user.placeOfBirth || "",
              birthCountry: user.birthCountry || "",
              nationality: user.nationality || "",
              birthDate: user.dateOfBirth || "",
              maritalStatus: user.maritalStatus || "",
              street: user.street || "",
              houseNumber: user.houseNumber || "",
              postalCode: user.postalCode || "",
              city: user.city || "",
              countryCode: user.countryCode || "+43",
              phone: user.phone || "",
              email: user.email || "",
              iban: user.iban || "",
              education: user.education || "",
              currentJob: user.currentProfession || "",
              industry: user.industry || "",
              occupation: user?.previousJobsRel?.[0]?.jobTitle || "",
              documentType: user?.documents?.[0]?.documentType || "",
              documentNumber: user?.documents?.[0]?.documentNumber || "",
              issuingAuthority: user?.documents?.[0]?.issuingAuthority || "",
              issuedOn: user?.documents?.[0]?.issuedOn || "",
              validUntil: user?.documents?.[0]?.validUntil || "",
              isPEP: user.isPep || false,
              residenceAbroad: user.residenceAbroad || false,
              actingFor: user.actsOnOwnAccount ? "own" : "other",
              magicFlow: process.env.NEXT_PUBLIC_ENV === 'development' ? true : false,
              country: user.country || "",
              bic: user.bic || "",
              bankName: user.bankName || "",
              isTaxResidentAT: user.isTaxResidentAT ?? null,
              isTaxResidentOther: user.isTaxResidentOther ?? null,
              gender: user.gender || "",
              isSelfEmployed: user.isSelfEmployed || false,
              taxResidencyCountry: user.taxResidencyCountry || "",
            });
          }
        } else {
          console.error("Error fetching user info:", data.message);
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };

    fetchUserInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session_id]);

  useEffect(() => {
    if (step === PHASES.CONTRACT_DOCUMENT) {
      const fetchContractDocument = async () => {
        setLoading(true);
        try {
          const response = await fetch(`/api/phase/contract-document`, {
            method: "POST",
            body: JSON.stringify({ sessionId: session_id, userInfo: formik.values, questions: questions, answers: answers }),
          });
          const data = await response.json();
          if (!data.success) {
            console.error("Failed to fetch contract document:", data.message);
          }
        } catch (error) {
          console.error("Error fetching contract document:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchContractDocument();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, session_id, formik.values]);

  const onPersonalInfoSubmit = async (data: PersonalInfoFormData) => {
    // console.log("🚀 ~ onPersonalInfoSubmit ~ data:", data)
    setLoading(true);

    try {
      const response = await fetch(`/api/user/update?id=${session_id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // age: data.age,
          dateOfBirth: data.birthDate
            ? new Date(data.birthDate).toISOString()
            : undefined,
          actsOnOwnAccount: data.actingFor === "own",
          city: data.city,
          currentProfession: data.currentJob,
          customerClassification: "",
          education: data.education,
          email: data.email,
          firstName: data.firstName,
          houseNumber: data.houseNumber,
          industry: data.industry,
          isPep: data.isPEP,
          lastName: data.lastName,
          maritalStatus: data.maritalStatus,
          nationality: data.nationality,
          countryCode: data.countryCode,
          phone: data.phone,
          placeOfBirth: data.birthPlace,
          birthCountry: data.birthCountry,
          postalCode: data.postalCode,
          residenceAbroad: data.residenceAbroad,
          street: data.street,
          occupation: data.occupation,
          documentType: data.documentType,
          documentNumber: data.documentNumber,
          issuingAuthority: data.issuingAuthority,
          issuedOn: data.issuedOn
            ? new Date(data.issuedOn).toISOString()
            : undefined,
          validUntil: data.validUntil
            ? new Date(data.validUntil).toISOString()
            : undefined,
          iban: data.iban,
          country: data.country,
          bic: data.bic,
          bankName: data.bankName,
          isTaxResidentAT: data.isTaxResidentAT,
          isTaxResidentOther: data.isTaxResidentOther,
          gender: data.gender,
          isSelfEmployed: data.isSelfEmployed,
          taxResidencyCountry: data.taxResidencyCountry,
        }),
      });
      const result = await response.json();
      if (result.success) {
        console.log("User info updated:");
      } else {
        console.error("Failed to update user info:", result.message);
      }
    } catch (error) {
      console.error('API error:', error);
    }

    // High-Risk & Tax Residency Checks
    const isHighRiskCountry = (country: string) => highRiskCountries.includes(country);

    // US Citizen Check (Comprehensive)
    const isUSCitizen =
      data.nationality === "Vereinigte Staaten" ||
      data.country === "Vereinigte Staaten" ||
      (data.isTaxResidentOther && data.taxResidencyCountry === "Vereinigte Staaten");
    // High Risk Check (Comprehensive)
    const isHighRisk =
      isHighRiskCountry(data.nationality) ||
      isHighRiskCountry(data.country || "") ||
      (data.isTaxResidentOther && isHighRiskCountry(data.taxResidencyCountry || ""));
    // Lives outside Austria
    const livesOutsideAustria = data.country !== "Österreich";

    if (
      data.isPEP ||
      livesOutsideAustria ||
      isHighRisk ||
      isUSCitizen ||
      data.isTaxResidentOther // Second tax residency is a blocker
    ) {
      setIsPepStop(true);
      setLoading(false);
      return;
    }

    setLoading(false);
    nextStep();
  };

  const saveAnswer = async (
    questionId: string,
    answer: string,
    question: string,
    questionType?: string,
    options?: Option[]
  ) => {
    try {
      const response = await fetch(`/api/answers?id=${session_id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId,
          answer,
          question,
          questionType,
          options,
        }),
      });
      const data = await response.json();
      if (data.success) {
        console.log("Answer saved:");
      } else {
        console.error("Failed to save answer:", data.message);
      }
    } catch (error) {
      console.error("API error:", error);
    }
  };

  const handleChatbotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    await sendMessage(input.trim());
  };

  const generatePDF = async () => {
    setLoading(true);

    try {

      const finalMergeResponse = await fetch('/api/documents/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId: session_id, base64Encode: true }),
      });

      if (!finalMergeResponse.ok) {
        throw new Error('Failed to merge PDFs');
      }

      // Get the merged PDF blob
      const finalMergeRes = await finalMergeResponse.json();

      const response = await fetch('/api/signteq/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: 'Dokument zur Unterschrift',
          documentName: `document-${session_id}.pdf`,
          documentBase64: finalMergeRes?.mergedPdfBase64 || '', // Use the filled PDF instead of the static one
          recipientEmail: formik.values.email,
          recipientName: `${formik.values.firstName} ${formik.values.lastName}`,
          sessionId: session_id,
        }),
      });

      const data = await response.json();

      // Log the full response for debugging
      // console.log('SignTeq API Response:', {
      //   status: response.status,
      //   statusText: response.statusText,
      //   success: data.success,
      //   error: data.error,
      //   hasSigningUrl: !!data.signing_url
      // });

      if (data.success && data.signing_url) {
        setSigningUrl(data.signing_url);
        // setSignTeqRequestId(data.id);
        console.log('✅ SignTeq session created successfully');
      } else {
        // Handle API errors with detailed messages
        const errorMessage = data.error || data.message || 'Failed to create SignTeq session';
        // const errorDetails = data.details || '';

        // Provide user-friendly error messages
        let userMessage = 'Ein Fehler ist beim Erstellen der Signatursitzung aufgetreten. ';

        if (response.status === 400) {
          userMessage += 'Die übermittelten Daten sind ungültig. Bitte überprüfen Sie Ihre Eingaben.';
        } else if (response.status === 401) {
          userMessage += 'Authentifizierung fehlgeschlagen. Bitte kontaktieren Sie den Support.';
        } else if (response.status === 500) {
          userMessage += 'Serverfehler. Bitte versuchen Sie es später erneut.';
        } else {
          userMessage += errorMessage;
        }

        throw new Error(userMessage);
      }
    } catch (error) {
      console.error("❌ Error generating final PDF:", error);

      // Provide user feedback
      const errorMsg = error instanceof Error ? error.message : 'Ein unbekannter Fehler ist aufgetreten';
      alert(`Fehler: ${errorMsg}\n\nBitte versuchen Sie es erneut oder kontaktieren Sie den Support.`);

      // Optionally, you could set an error state to display in the UI
      // setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSigningSuccess = async () => {
    console.log('✅ Document signed successfully!');
    setLoading(true);

    try {
      // NOTE: We no longer download here.
      // The document is only downloadable after all recipients have signed.
      // SignTeq will notify our webhook (/api/v1/webhook/signteq) with event=document_completed,
      // and the backend will download+save the PDF then.

      // Update session status
      const statusResponse = await fetch('/api/user/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session_id }),
      });

      if (!statusResponse.ok) {
        console.error('❌ Failed to update status:', statusResponse.status);
      }

      setSuccess(true);

      // Redirect to success page after a short delay
      setTimeout(() => {
        router.push('/customer/success');
      }, 2000);

    } catch (error) {
      console.error('❌ Error in post-signing process:', error);

      setSuccess(true); // Still mark as success since signing completed

      // Redirect anyway but log the error
      setTimeout(() => {
        router.push('/customer/success');
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const handleSigningError = (error: string) => {
    console.error('❌ Signing error:', error);
    setError(error);
  };

  const handleSigningCancel = () => {
    console.log('ℹ️ Signing cancelled by user');
    setSigningUrl(null);
  };

  return (
    <div className={stepperContainerClass}>
      {/* Stepper Progress */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 lg:mb-8">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className={`${stepperBarClass} ${step > i + 1 ? "bg-blue-600" : "bg-gray-300"
              }`}
          ></div>
        ))}
      </div>
      {loading ? (
        <div className="flex items-center justify-center w-full h-32 sm:h-48 lg:h-64">
          <div className="text-gray-500 animate-pulse text-sm sm:text-base">Wird geladen...</div>
        </div>
      ) : (
        <React.Fragment>
          <div className={cardClass}>
            <div ref={currentSubStep === 'QUESTIONS2' ? questionSectionRef : null} className="flex-1 flex flex-col min-h-0 overflow-y-auto">
              {step === PHASES.TERMS1 && currentSubStep === 'TERMS1' && (
                <TermsScreen
                  title="4MONEY"
                  subtitle="Information über das Wertpapierdienstleistungsunternehmen"
                  confirmed={confirmed}
                >
                  <FourMoneyInfo />
                </TermsScreen>
              )}

              {step === PHASES.TERMS1 && currentSubStep === 'TERMS_FROOTS' && (
                <TermsScreen
                  title="Asset Management by froots GmbH"
                  subtitle="Kundeninformationen"
                  confirmed={confirmed}
                >
                  <FrootsCustomerInfo />
                </TermsScreen>
              )}

              {step === PHASES.TERMS2 && currentSubStep === 'TERMS2' && (
                <TermsScreen
                  title="Nachhaltigkeitsrisiken"
                  subtitle="Bitte lesen Sie sorgfältig, bevor Sie bestätigen"
                  confirmed={confirmed}
                >
                  <SustainabilityRisksInfo />
                </TermsScreen>
              )}

              {step === PHASES.QUESTIONS1 && currentSubStep === 'QUESTIONS1' && (
                <div className="w-full h-full flex items-start justify-center p-4 sm:p-6 md:p-8">
                  <div className="w-full max-w-4xl grid gap-4 pb-6">
                    {currentPageQuestions.map((q, idx) => (
                      <QuestionCard
                        key={q.id}
                        step={(currentPage - 1) * QUESTIONS_PER_PAGE + idx + 1}
                        totalSteps={questions.length}
                        questionId={q.id}
                        question={q.text}
                        questionText={q.text}
                        questionType={q.questionType}
                        options={
                          q?.options?.length
                            ? q.options.map((opt) => ({ label: opt.label, value: opt.value }))
                            : undefined
                        }
                        questionOrder={q?.questionOrder}
                        selected={answers[q?.id]}
                        maxValue={q?.maxValue || undefined}
                        minValue={q?.minValue || undefined}
                        errorMessage={
                          q?.questionOrder === 18
                            ? getOneTimeInvestmentErrorMessage(q, answers[q?.id])
                            : q?.questionOrder === 19
                              ? getMonthlyInvestmentErrorMessage(q, answers[q?.id])
                              : (q?.minValue && answers[q?.id] && parseInt(answers[q?.id], 10) < q.minValue)
                                ? "Wir haben derzeit kein Produkt für diese Laufzeit."
                                : undefined
                        }
                        footnote={q?.footnote}
                        inputPlaceholder={q?.inputPlaceholder}
                        onSelect={async (opt) => {
                          await handleSelectQuestion(q, opt);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {step === PHASES.QUESTIONS2 && currentSubStep === 'QUESTIONS2' && (
                <div className="w-full h-full flex items-start justify-center p-4 sm:p-6 md:p-8">
                  <div className="w-full max-w-4xl grid gap-4 pb-6">
                    {currentPageQuestions.map((q, idx) => (
                      <QuestionCard
                        key={q.id}
                        step={(currentPage - 1) * QUESTIONS_PER_PAGE + idx + 1 + 2}
                        totalSteps={questions.length}
                        questionId={q.id}
                        question={q.text}
                        questionText={q.text}
                        questionType={q.questionType}
                        options={
                          q?.options?.length
                            ? q.options.map((opt) => ({ label: opt.label, value: opt.value }))
                            : undefined
                        }
                        questionOrder={q?.questionOrder}
                        selected={answers[q?.id]}
                        maxValue={q?.maxValue || undefined}
                        minValue={q?.minValue || undefined}
                        errorMessage={
                          q?.questionOrder === 18
                            ? getOneTimeInvestmentErrorMessage(q, answers[q?.id])
                            : q?.questionOrder === 19
                              ? getMonthlyInvestmentErrorMessage(q, answers[q?.id])
                              : (q?.minValue && answers[q?.id] && parseInt(answers[q?.id], 10) < q.minValue)
                                ? "Wir haben derzeit kein Produkt für diese Laufzeit."
                                : undefined
                        }
                        forbiddenValues={q?.questionOrder === 9 || q?.questionOrder === 10 ? ["none"] : undefined}
                        forbiddenErrorMessage={q?.questionOrder === 9 || q?.questionOrder === 10 ? "Mit dieser Auswahl können Sie nicht fortfahren." : undefined}
                        footnote={q?.footnote}
                        inputPlaceholder={q?.inputPlaceholder}
                        onSelect={async (opt) => {
                          await handleSelectQuestion(q, opt);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {step === PHASES.SUGGESTIONS && (
                <div className="w-full h-full flex flex-col overflow-hidden">
                  {/* Product Document */}
                  <div className="p-2 sm:p-4 md:p-6 flex-1 flex flex-col min-h-0">
                    <div className="w-full border border-gray-200 rounded-lg overflow-hidden bg-white flex-1 flex flex-col shadow-sm">
                      {suggestedProduct?.fileName ? (
                        <div className="w-full h-full relative">
                          <Worker workerUrl={CONFIG.EXTERNAL.PDF_WORKER_URL}>
                            <div className="h-full w-full [&_.rpv-core\_\_viewer]:!h-full [&_.rpv-core\_\_inner-pages]:!p-2 sm:[&_.rpv-core\_\_inner-pages]:!p-4">
                              <Viewer
                                fileUrl={
                                  suggestedProduct.fileName.startsWith("http")
                                    ? suggestedProduct.fileName
                                    : `${process.env.NEXT_PUBLIC_FRONTEND_URL || ''}/api/products/file/${suggestedProduct.fileName.replace(/^\/products\//, '')}`
                                }
                                defaultScale={SpecialZoomLevel.PageWidth}
                              />
                            </div>
                          </Worker>
                        </div>
                      ) : (
                        <div className="w-full flex-1 flex flex-col items-center justify-center text-gray-500 p-6">
                          <svg className="w-12 h-12 sm:w-16 sm:h-16 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-sm sm:text-base font-medium mb-2">Kein Produktdokument verfügbar</p>
                          <p className="text-xs sm:text-sm text-gray-400">Produktinformationen werden separat bereitgestellt</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {step === PHASES.CHAT && (
                <div className="flex flex-col h-full">
                  <Chatbot
                    sessionId={session_id || ""}
                    threadId={threadId || ""}
                    messages={messages}
                    input={input}
                    setInput={setInput}
                    handleSubmit={handleChatbotSubmit}
                    loading={chatBtnLading}
                    onAudioProcessed={handleAudioProcessed}
                  />
                </div>
              )}

              {step === PHASES.PERSONAL_INFO && (
                <div className="w-full h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto">
                    <div className="container mx-auto p-4 sm:p-6 md:p-8 max-w-6xl">
                      {/* <h1 className="text-xl font-bold text-center mb-6">Personal Information Form</h1> */}
                      <PersonalInfoForm formik={formik} highRiskCountries={highRiskCountries} />
                    </div>
                  </div>
                </div>
              )}

              {step === PHASES.INVESTMENT_FORM && (
                <div className="w-full h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto">
                    <div className="container mx-auto p-4 sm:p-6 md:p-8 max-w-6xl">
                      {/* <h1 className="text-xl font-bold text-center mb-6">Investment Form</h1> */}
                      <InvestmentForm
                        investmentFormData={investmentFormData}
                        handleCheckboxChange={handleCheckboxChange}
                        suggestedProduct={suggestedProduct}
                        questions={questions}
                        answers={answers}
                      />
                    </div>
                  </div>
                </div>
              )}

              {
                step === PHASES.CONTRACT_DOCUMENT && (
                  <div className="w-full h-full flex flex-col">
                    <div className="flex-1 overflow-y-auto">
                      <div className="container mx-auto p-4 sm:p-6 md:p-8 max-w-6xl">
                        <ContractDocument
                          expandedSections={expandedSections}
                          toggleSection={toggleSection}
                          agreements={agreements}
                          handleCheckboxChangeContractDocument={handleCheckboxChangeContractDocument}
                          handleAcceptAll={handleAcceptAll}
                          sessionId={session_id || ""}
                        />
                      </div>
                    </div>
                  </div>
                )
              }

              {step === PHASES.RESULT_PDF && currentSubStep === 'RESULT_PDF' && (
                <div className="w-full h-full flex flex-col">
                  <div className="flex-1 p-0 sm:p-0 md:p-0 flex flex-col">
                    <div className="max-w-6xl mx-auto w-full flex flex-col h-full">
                      {signingUrl && !success && (
                        <React.Fragment>
                          <div className="p-0 sm:p-0 flex-1 flex flex-col">
                            <SignTeqIframe
                              src={signingUrl}
                              onSuccess={handleSigningSuccess}
                              onError={handleSigningError}
                              onCancel={handleSigningCancel}
                              className="w-full flex-1 min-h-[400px] h-full rounded-lg border border-gray-200"
                            />
                          </div>

                          {error && (
                            <div className="m-4 sm:m-6 p-4 sm:p-6 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-start gap-3">
                                <div className="w-5 h-5 mt-0.5 flex-shrink-0">
                                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                <div>
                                  <h4 className="text-sm sm:text-base font-semibold text-red-800 mb-1">
                                    Signaturfehler
                                  </h4>
                                  <p className="text-sm text-red-700">{error}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      )}

                      {success && (
                        <div className="p-6 sm:p-8 md:p-12 text-center">
                          <div className="max-w-md mx-auto">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>

                            <h3 className="text-xl sm:text-2xl font-bold text-green-600 mb-3 sm:mb-4">
                              Dokument erfolgreich signiert!
                            </h3>

                            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                              Ihr Dokument wurde erfolgreich signiert und verarbeitet.
                            </p>

                            {loading && (
                              <div className="mb-4 sm:mb-6">
                                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-500 mx-auto mb-3">
                                </div>
                                <p className="text-xs sm:text-sm text-gray-500">
                                  Signiertes Dokument wird heruntergeladen und gespeichert...
                                </p>
                              </div>
                            )}

                            {downloadedDocumentPath && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6 text-left">
                                <div className="flex items-start gap-3">
                                  <div className="w-5 h-5 mt-0.5 flex-shrink-0">
                                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-sm sm:text-base text-blue-800 font-medium mb-2">
                                      ✅ Signiertes Dokument erfolgreich gespeichert!
                                    </p>
                                    <a
                                      href={downloadedDocumentPath}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-2 text-sm sm:text-base text-blue-600 hover:text-blue-800 underline font-medium"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>

                                    </a>
                                  </div>
                                </div>
                              </div>
                            )}

                            <p className="text-xs sm:text-sm text-gray-500 mb-6 sm:mb-8">
                              Weiterleitung zur Erfolgsseite...
                            </p>

                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                              <button
                                onClick={() => router.push('/customer/success')}
                                className="w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-sm sm:text-base"
                              >
                                Zur Erfolgsseite
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 p-4 sm:p-6 bg-gray-50 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={() => {
                  if (step === 1 && currentSubStep === 'QUESTIONS1') {
                    if (questionIndex === 1) {
                      setCurrentSubStep('TERMS_FROOTS');
                      savePhase(1, 'TERMS_FROOTS');
                    } else {
                      setQuestionIndex((s) => s - 1);
                    }
                  } else if (step === 1 && currentSubStep === 'QUESTIONS2') {
                    if (questionIndex === 1) {
                      setCurrentSubStep('TERMS2');
                      savePhase(1, 'TERMS2');
                    } else {
                      setQuestionIndex((s) => s - 1);
                    }
                  } else {
                    prevStep();
                  }
                }}
                disabled={step === 1 && currentSubStep === 'TERMS1'}
                className={`${buttonBaseClass} ${buttonBackClass} order-2 sm:order-1 w-full sm:w-auto`}
              >
                <span>Zurück</span>
              </button>
              <div className="flex justify-end order-1 sm:order-2">
                {(step === 1 && (currentSubStep === 'TERMS1' || currentSubStep === 'TERMS_FROOTS' || currentSubStep === 'TERMS2')) ? (
                  <button
                    onClick={handleConfirm}
                    disabled={confirmed}
                    className={`${buttonBaseClass} ${confirmed ? buttonConfirmedClass : buttonConfirmClass
                      } disabled:cursor-not-allowed w-full sm:w-auto`}
                  >
                    {confirmed ? (
                      <>
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="hidden sm:inline">Bestätigt!</span>
                        <span className="sm:hidden">✓</span>
                      </>
                    ) : (
                      <span>Ich bestätige</span>
                    )}
                  </button>
                ) : (step === 1 && (currentSubStep === 'QUESTIONS1' || currentSubStep === 'QUESTIONS2')) ||
                  step === PHASES.PERSONAL_INFO ? (
                  <button
                    onClick={() => {
                      // Sustainability Check (Q3) - if answer is "no" or "nein"
                      const sustainabilityQ3 = questions[2];
                      const isSustainabilityQ3Page = currentPageQuestions.some(q => q.id === sustainabilityQ3?.id);

                      if (step === 1 && currentSubStep === 'QUESTIONS2' && isSustainabilityQ3Page) {
                        if (sustainabilityQ3 && answers[sustainabilityQ3.id]) {
                          const val = answers[sustainabilityQ3.id].toLowerCase();
                          if (val === 'no' || val === 'nein') {
                            setIsSustainabilityStop(true);
                            return;
                          }
                        }
                      }

                      // Sustainability Preferences Check (Q4) - if answer is "ja" or "nein"
                      const sustainabilityQ4 = questions[3];
                      const isSustainabilityQ4Page = currentPageQuestions.some(q => q.id === sustainabilityQ4?.id);

                      if (step === 1 && currentSubStep === 'QUESTIONS2' && isSustainabilityQ4Page) {
                        if (sustainabilityQ4 && answers[sustainabilityQ4.id]) {
                          const val = answers[sustainabilityQ4.id].toLowerCase();
                          if (val === 'ja' || val === 'yes' || val === 'nein' || val === 'no') {
                            setIsSustainabilityStop(true);
                            return;
                          }
                        }
                      }

                      // Equities Check (Q12)
                      const equitiesQ = questions[11];
                      const isEquitiesPage = currentPageQuestions.some(q => q.id === equitiesQ?.id);

                      // Bound check (Q14)
                      const boundQ = questions[13];
                      const isBoundPage = currentPageQuestions.some(q => q.id === boundQ?.id);

                      // Gold checj (Q16)
                      const goldQ = questions[15];
                      const isGoldPage = currentPageQuestions.some(q => q.id === goldQ?.id);

                      if (step === 1 && currentSubStep === 'QUESTIONS2') {
                        // Check equities only if on the page with Q12
                        if (isEquitiesPage && equitiesQ && answers[equitiesQ.id]) {
                          const val = answers[equitiesQ.id].toLowerCase();
                          if (val === 'none' || val === 'keine' || val === 'kenne ich nicht') {
                            setIsPepStop(true);
                            return;
                          }
                        }

                        // Check bounds only if on the page with Q14
                        if (isBoundPage && boundQ && answers[boundQ.id]) {
                          const val = answers[boundQ.id].toLowerCase();
                          if (val === 'none' || val === 'keine' || val === 'kenne ich nicht') {
                            setIsPepStop(true);
                            return;
                          }
                        }

                        // Check gold only if on the page with Q16
                        if (isGoldPage && goldQ && answers[goldQ.id]) {
                          const val = answers[goldQ.id].toLowerCase();
                          if (val === 'none' || val === 'keine' || val === 'kenne ich nicht') {
                            setIsPepStop(true);
                            return;
                          }
                        }
                      }


                      // Disposable Income Check
                      // Only check if we are in QUESTIONS2 and the current page contains the relevant questions
                      const incomeQ = questions[5];
                      const expensesQ = questions[6];
                      const isIncomePage = currentPageQuestions.some(q => q.id === incomeQ?.id || q.id === expensesQ?.id);

                      if (step === 1 && currentSubStep === 'QUESTIONS2' && isIncomePage) {
                        if (incomeQ && expensesQ && answers[incomeQ.id] && answers[expensesQ.id]) {
                          const income = parseFloat(answers[incomeQ.id]);
                          const expenses = parseFloat(answers[expensesQ.id]);
                          if (!isNaN(income) && !isNaN(expenses) && (income - expenses) <= 150) {
                            setIsIncomeStop(true);
                            return;
                          }
                        }
                      }

                      if (step === 1 && currentSubStep === 'QUESTIONS1') {
                        if ((questionIndex * QUESTIONS_PER_PAGE) >= totalQuestions1) {
                          lastQuestionNext();
                        } else {
                          setQuestionIndex((s) => Math.min(s + 1, totalPages1));
                        }
                      } else if (step === 1 && currentSubStep === 'QUESTIONS2') {
                        if ((questionIndex * QUESTIONS_PER_PAGE) >= totalQuestions2) {
                          lastQuestionNext();
                        } else {
                          setQuestionIndex((s) => Math.min(s + 1, totalPages2));
                        }
                      } else {
                        formik.handleSubmit();
                      }
                    }}
                    disabled={
                      (step === 1 && currentSubStep === 'QUESTIONS1' && !isCurrentPageValid) ||
                      (step === 1 && currentSubStep === 'QUESTIONS2' && !isCurrentPageValid)
                    }
                    className={`${buttonBaseClass} ${buttonNextClass} disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto`}
                    type={step === PHASES.PERSONAL_INFO ? "submit" : "button"}
                  >
                    <span>Nächste</span>
                  </button>
                ) : (step === 7 && currentSubStep === 'RESULT_PDF') ? null : (
                  <button
                    onClick={step < 7 ? nextStep : backDashboard}
                    className={`${buttonBaseClass} ${buttonNextClass} disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto`}
                    disabled={
                      (step === PHASES.INVESTMENT_FORM && !investmentFormData.allConfirmed) ||
                      (step === PHASES.CONTRACT_DOCUMENT && !agreements.acceptAll)
                    }
                  >
                    <span>{step == 7 && currentSubStep === 'RESULT_PDF' ? 'Abschließen' : 'Nächste'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </React.Fragment>
      )}

      {/* PEP Stop Screen */}
      {isPepStop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center transform transition-all scale-100">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Antrag gestoppt
            </h3>

            <div className="space-y-4 text-gray-600">
              <p className="font-medium text-lg">
                Ihr Antrag kann nicht digital abgeschlossen werden.
              </p>
              <p>
                Aus regulatorischen Gründen ist eine persönliche Betreuung notwendig.
              </p>
              <p className="text-sm bg-gray-50 p-4 rounded-lg border border-gray-100">
                Ihr Berater wird sich zeitnah bei Ihnen melden, um den Prozess manuell fortzuführen.
              </p>
            </div>

            <div className="mt-8">
              <button
                onClick={() => router.push('/customer/dashboard')}
                className="w-full px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Zurück zum Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Income Stop Screen */}
      {isIncomeStop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center transform transition-all scale-100">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Antrag gestoppt
            </h3>

            <div className="space-y-4 text-gray-600">
              <p className="font-medium text-lg">
                Das angegebene verfügbare Einkommen ist leider zu gering für eine finanzielle Anlage
              </p>
            </div>

            <div className="mt-8">
              <button
                onClick={() => router.push('/customer/dashboard')}
                className="w-full px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Zurück zum Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sustainability Stop Popup */}
      <SustainabilityStopPopup
        isOpen={isSustainabilityStop}
        onClose={() => setIsSustainabilityStop(false)}
        title="Antrag gestoppt"
        message="Ihr Antrag kann nicht digital abgeschlossen werden."
        subMessage="Aufgrund Ihrer Nachhaltigkeitspräferenzen ist eine persönliche Beratung erforderlich."
        infoText="Ihr Berater wird sich zeitnah bei Ihnen melden, um den Prozess manuell fortzuführen."
      />
    </div>
  );
}
