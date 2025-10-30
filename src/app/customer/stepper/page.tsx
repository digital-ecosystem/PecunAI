"use client";
import {
  Message,
  Option,
  PersonalInfoFormData,
  Question,
  Role,
  TermsAndConditions,
} from "@/types";
import { CheckCircle } from "lucide-react";
import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useState } from "react";
// import HTMLRenderer from '@/components/HTMLRenderer';
import './index.css';
const QuestionCard = dynamic(() => import("./QuestionCard"), {
  ssr: false,
  loading: () => <div className="animate-pulse">Loading questions...</div>,
});
const PersonalInfoForm = dynamic(() => import("./PersonalInfoForm"), {
  ssr: false,
  loading: () => <div className="animate-pulse">Loading personal info...</div>,
});
const Chatbot = dynamic(() => import("./Chatbot"), {
  ssr: false,
  loading: () => <div className="animate-pulse">Loading personal info...</div>,
});
import * as Yup from "yup";
import { useFormik } from "formik";
import { useSearchParams, useRouter } from "next/navigation";
import { useSignD } from "@/hooks/useSignD";
import { SignDHandshakePayload } from "@/types/signd";
import { SignDIframe } from "@/components/SignDIframe";
import { generatePDF as GenerateSimplePDF } from "@/utils/pdfGenerator";
import { SignTeqIframe } from "@/components/SignTeqIframe";
import { pdfBlobToBase64 } from "@/utils/pdfUtils";
// import { pdfBlobToBase64 } from "@/utils/pdfUtils";

const PHASES = {
  TERMS1: 1,
  QUESTIONS1: 2,
  TERMS2: 3,
  QUESTIONS2: 4,
  SUGGESTIONS: 5,
  CHAT: 6,
  PERSONAL_INFO: 7,
  SIGN_DOCUMENT: 8,
  RESULT_PDF: 9,
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
};

const stepperBarClass = "flex-1 h-2 mx-1 rounded";
const stepperContainerClass =
  "w-full h-screen px-4 sm:px-6 lg:px-8 py-4 sm:py-6 bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col overflow-hidden";
const cardClass =
  "flex-1 w-full max-w-7xl mx-auto bg-white rounded-lg sm:rounded-2xl shadow-lg sm:shadow-xl overflow-hidden flex flex-col";
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
//   conservative: 'Konservativ',
//   risk_aware: 'Ausgewogen',
//   opportunity_oriented: 'Gewinnorientiert',
// };

const validationSchema = Yup.object({
  firstName: Yup.string()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must be at most 50 characters")
    .required("First name is required"),

  lastName: Yup.string()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must be at most 50 characters")
    .required("Last name is required"),

  birthPlace: Yup.string()
    .min(2, "Place of birth must be at least 2 characters")
    .required("Place of birth is required"),

  nationality: Yup.string()
    .min(2, "Nationality must be at least 2 characters")
    .required("Nationality is required"),

  birthDate: Yup.date()
    .max(new Date(), "Birth date cannot be in the future")
    .required("Birth date is required"),

  maritalStatus: Yup.string()
    .oneOf(
      ["Single", "Married", "Divorced", "Widowed"],
      "Invalid marital status"
    )
    .required("Marital status is required"),

  street: Yup.string()
    .min(2, "Street must be at least 2 characters")
    .required("Street is required"),

  houseNumber: Yup.string()
    .matches(/^[a-zA-Z0-9/-]{1,10}$/, "Invalid house number")
    .required("House number is required"),

  postalCode: Yup.string()
    .matches(/^\d{4,10}$/, "Postal code must be 4 to 10 digits")
    .required("Postal code is required"),

  city: Yup.string()
    .min(2, "City must be at least 2 characters")
    .required("City is required"),

  phone: Yup.string()
    .matches(
      /^\+?\d{7,15}$/,
      "Phone number must be 7 to 15 digits, optionally starting with '+'"
    )
    .required("Phone number is required"),

  email: Yup.string()
    .email("Invalid email format")
    .required("Email is required"),

  education: Yup.string()
    .min(2, "Education field must be at least 2 characters")
    .required("Education is required"),

  currentJob: Yup.string()
    .min(2, "Current job must be at least 2 characters")
    .required("Current job is required"),

  industry: Yup.string()
    .min(2, "Industry must be at least 2 characters")
    .required("Industry is required"),

  occupation: Yup.string()
    .min(2, "Occupation must be at least 2 characters")
    .required("Occupation is required"),

  documentType: Yup.string()
    .oneOf(
      ["passport", "identity_card", "drivers_license"],
      "Invalid document type"
    )
    .required("Document type is required"),

  documentNumber: Yup.string()
    .matches(
      /^[a-zA-Z0-9]{4,20}$/,
      "Document number must be 4–20 alphanumeric characters"
    )
    .required("Document number is required"),

  issuingAuthority: Yup.string()
    .min(2, "Issuing authority must be at least 2 characters")
    .required("Issuing authority is required"),

  issuedOn: Yup.date()
    .required("Issue date is required")
    .max(new Date(), "Issue date can't be in the future"),

  validUntil: Yup.date()
    .min(Yup.ref("issuedOn"), "Valid until must be after issue date")
    .required("Valid until date is required"),
});

// Test credentials from the documentation
const TEST_CREDENTIALS = {
  login: "83212e3b-6ff3-4cfe-afe3-80f107d8ae20",
  token: "TD5QZ22FAmh3IMd8ozeuwG9kVCkwcmsbPhy1KPWaMaAaGKiMmOHPsRm7MGaeRbQ8",
};

export default function Stepper() {
  const [loading, setLoading] = useState(true);
  const [chatBtnLading, setChatBtnLanding] = useState(false);
  const [step, setStep] = useState(PHASES.TERMS1);
  const [confirmed, setConfirmed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionIndex, setQuestionIndex] = useState(1);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [termsAndConditions, setTermsAndConditions] = useState<
    TermsAndConditions[]
  >([]);
  const [suggestedProduct, setSuggestedProduct] = useState<Portfolio | null>(
    null
  );
  const searchParams = useSearchParams();
  const router = useRouter();
  const [threadId, setThreadId] = useState(null);
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  // const [finalPDFUrl, setFinalPDFUrl] = useState<string | null>(null);
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [signTeqRequestId, setSignTeqRequestId] = useState<string | null>(null);
  console.log("🚀 ~ Stepper ~ signTeqRequestId:", signTeqRequestId)
  const [signTeqDocumentId, setSignTeqDocumentId] = useState<string | null>(null);
  const [downloadedDocumentPath, setDownloadedDocumentPath] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const session_id = searchParams.get('session_id')

  // For PHASES.QUESTIONS1
  const questions1 = questions.slice(0, 3);
  const currentQ = questions1[questionIndex - 1];
  // For PHASES.QUESTIONS2
  const questions2 = questions.slice(3, 5);
  const currentQ2 = questions2[questionIndex - 1];

  const {
    // isLoading,
    error,
    sessionData: signDSessionData,
    // result,
    createSession,
    getResult,
    downloadIDV,
    getIframeUrl,
    setError,
  } = useSignD(TEST_CREDENTIALS);
    console.log("🚀 ~ Stepper ~ signDSessionData:", signDSessionData)

  const formik = useFormik({
    initialValues: {
      firstName: "",
      lastName: "",
      birthPlace: "",
      nationality: "Austria",
      birthDate: "",
      maritalStatus: "",
      street: "",
      houseNumber: "",
      postalCode: "",
      city: "",
      phone: "",
      email: "",
      education: "",
      currentJob: "",
      industry: "",
      occupation: "",
      documentType: "",
      documentNumber: "",
      issuingAuthority: "",
      issuedOn: "",
      validUntil: "",
      isPEP: false,
      residenceAbroad: false,
      actingFor: "",
      magicFlow: true,
    },
    validationSchema,
    onSubmit: (values: PersonalInfoFormData) => {
      onPersonalInfoSubmit(values);
    },
  });

  const handleConfirm = async () => {
    setConfirmed(true);
    await saveUpdatedTermsStatus(); // Call API to save acceptance
    setTimeout(() => {
      setConfirmed(false);
      nextStep();
    }, 2000);
  };

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 9));
  const prevStep = () => {
    if (step === PHASES.SUGGESTIONS) {
      setQuestionIndex(2);
    }
    if (step === PHASES.TERMS2) {
      setQuestionIndex(3);
    }
    setStep((prev) => Math.max(prev - 1, 1));
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
    setQuestionIndex(1);
    nextStep();
  };

  const sendMessage = useCallback(
    async (messageOverride: string = "", shouldAppend: boolean = true) => {
      console.log("🚀 ~ sendMessage ~ messageOverride:", messageOverride);
      const messageToSend =
        messageOverride.length > 0 ? messageOverride : input.trim();
      console.log("🚀 ~ Stepper ~ messageToSend:", messageToSend);
      console.log("🚀 ~ sendMessage ~ messageToSend:", messageToSend);
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
                      const newMessages = [...prev];
                      const lastMessage = newMessages[newMessages.length - 1];
                      if (lastMessage && lastMessage.role === Role.assistant) {
                        lastMessage.content += data.content;
                      }
                      return newMessages;
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

  const fetchTermsAndConditions = useCallback(async () => {
    setLoading(true);
    try {
      // URL should be like /api/terms-conditions?id=1

      const fetchUrl = "/api/terms-conditions?session_id=" + session_id;
      const response = await fetch(fetchUrl, {
        method: "GET",
      });
      const data = await response.json();
      if (data?.success) {
        setTermsAndConditions(data.data);
      } else {
        router.push("/customer/signin");
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
    } finally {
      setLoading(false);
    }
  }, [session_id, router]);

  // // Helper function to analyze questions and find relevant ones
  // const findQuestionByKeywords = (questions: Question[], keywords: string[]) => {
  //   return questions.find(q =>
  //     keywords.some(keyword => q.text.toLowerCase().includes(keyword.toLowerCase()))
  //   );
  // };

  // // Enhanced function to find questions with scoring
  // const findBestMatchingQuestion = (questions: Question[], keywords: string[]) => {
  //   console.log("🚀 ~ findBestMatchingQuestion ~ keywords:", keywords)
  //   console.log("🚀 ~ findBestMatchingQuestion ~ questions:", questions)
  //   let bestMatch = null;
  //   let highestScore = 0;

  //   for (const question of questions) {
  //     const questionText = question.text.toLowerCase();
  //     let score = 0;

  //     // Count how many keywords match
  //     for (const keyword of keywords) {
  //       if (questionText.includes(keyword.toLowerCase())) {
  //         score++;
  //       }
  //     }

  //     // Boost score if multiple keywords match
  //     if (score > highestScore) {
  //       highestScore = score;
  //       bestMatch = question;
  //     }
  //   }

  //   return bestMatch;
  // };

  const suggestProduct = async (
    duration: string,
    risk: string
  ): Promise<Portfolio | null> => {
    try {
      console.log("🔍 Requesting product suggestion:", { duration, risk });

      const response = await fetch(
        `/api/phase/product?duration=${duration}&risk=${risk}`,
        {
          method: "GET",
        }
      );

      const data = await response.json();
      console.log("🎯 Product suggestion response:", data);

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
        console.log("🤖 Initializing chat for product:", productId);

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
          console.log("✅ Chat initialized successfully:", data.message);

          // Update thread ID if provided
          if (data.threadId && !threadId) {
            setThreadId(data.threadId);
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

  useEffect(() => {
    const fetchSuggestedProduct = async () => {
      if (step === PHASES.SUGGESTIONS && questions.length > 0) {
        try {
          setLoading(true);

          // Enhanced question matching with multiple strategies
          // console.log('📊 All questions available:', questions.map(q => ({ id: q.id, text: q.text })));

          const durationKeywords = [
            "short_term",
            "medium_term",
            "long_term",
            "very_long_term",
          ]; // 'time', 'year', 'duration', 'horizon', 'long', 'period', 'when', 'invest', 'plan', 'month'
          const riskKeywords = [
            "conservative",
            "opportunity_oriented",
            "risk_aware",
          ]; // 'risk', 'comfortable', 'volatility', 'tolerance', 'fluctuation', 'loss', 'willing', 'safe'

          const durationEntry = Object.entries(answers).find(([, value]) =>
            durationKeywords.includes(value)
          );
          const riskEntry = Object.entries(answers).find(([, value]) =>
            riskKeywords.includes(value)
          );

          const durationKey = durationEntry?.[0]; // question id for duration
          // const durationValue = durationEntry?.[1]; // actual selected value

          const riskKey = riskEntry?.[0]; // question id for risk
          // const riskValue = riskEntry?.[1]; // actual selected value

          let durationQuestionId = durationKey;
          let riskQuestionId = riskKey;

          // Strategy 3: If keyword matching fails, use positional fallback
          if (!durationQuestionId && questions.length > 0) {
            // Assume duration is typically asked early (first 3 questions)
            durationQuestionId = questions[0]?.id;
            for (let i = 0; i < Math.min(3, questions.length); i++) {
              if (answers[questions[i].id]) {
                durationQuestionId = questions[i].id;
                break;
              }
            }
          }

          if (!riskQuestionId && questions.length > 1) {
            // Assume risk is typically asked later (questions 2-5)
            riskQuestionId = questions[Math.min(3, questions.length - 1)]?.id;
            for (let i = 1; i < questions.length; i++) {
              if (
                answers[questions[i].id] &&
                questions[i].id !== durationQuestionId
              ) {
                riskQuestionId = questions[i].id;
                break;
              }
            }
          }

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
                console.log(
                  "🤖 Auto-initializing chat for selected product:",
                  product.name
                );
                await initializeChatWithProduct(product.id);
              } catch (saveError) {
                console.error("Failed to save product suggestion:", saveError);
                // Still try to initialize chat even if saving fails
                await initializeChatWithProduct(product.id);
              }
            }
          } else {
            console.warn("⚠️ Missing required answers for product suggestion", {
              hasDurationId: !!durationQuestionId,
              hasRiskId: !!riskQuestionId,
              hasDurationAnswer: durationQuestionId
                ? !!answers[durationQuestionId]
                : false,
              hasRiskAnswer: riskQuestionId ? !!answers[riskQuestionId] : false,
            });
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
    fetchTermsAndConditions();
  }, [fetchTermsAndConditions, session_id]);

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/phase?id=" + session_id, {
          method: "GET",
        });
        const data = await res.json();
        if (data.success) {
          setQuestions(data.questions);
          setAnswers(data.answers || {});
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
          // Set formik values if user details are available
          if (user) {
            formik.setValues({
              firstName: user.firstName || "",
              lastName: user.lastName || "",
              birthPlace: user.placeOfBirth || "",
              nationality: user.nationality || "",
              birthDate: user.dateOfBirth || "",
              maritalStatus: user.maritalStatus || "",
              street: user.street || "",
              houseNumber: user.houseNumber || "",
              postalCode: user.postalCode || "",
              city: user.city || "",
              phone: user.phone || "",
              email: user.email || "",
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
              magicFlow: true,
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
  }, [session_id]);

  const onPersonalInfoSubmit = async (data: PersonalInfoFormData) => {
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
          phone: data.phone,
          placeOfBirth: data.birthPlace,
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
    const payload: Omit<SignDHandshakePayload, 'login' | 'token'> = {
      type: 'identification',
      attributes: {
        individual: {
          first_name: data.firstName,
          last_name: data.lastName,
          dob: data.birthDate,
          // birth_place: data.birthPlace,
          // nationality: data.nationality,
          phone_number: data.phone,
          email: data.email,
          // education: data.education,
          // current_job: data.currentJob,
          // industry: data.industry,
          // occupation: data.occupation,
          // is_pep: data.isPEP,
          // residence_abroad: data.residenceAbroad,
        },
        address: {
          street: data.street,
          number: data.houseNumber,
          zip: data.postalCode,
          city: data.city,
          country_code: "AT", // or a field from form if it's dynamic
        },
        // ye
      },
      settings: {
        redirect_success_url: "http://localhost:3000/success",
        redirect_error_url: "http://localhost:3000/error",
      },
      magic_flow: true,
    };
    await createSession(payload);
    setLoading(false);
    nextStep();
  };

  const saveUpdatedTermsStatus = async () => {
    // Get the current terms and session info
    const termsIndex =
      step === PHASES.TERMS1 ? 0 : termsAndConditions.length > 1 ? 1 : 0;
    const terms = termsAndConditions[termsIndex];

    // You may want to get user agent and IP from the client or server
    const payload = {
      qaSessionId: session_id,
      termsId: terms?.id,
      termsType: terms?.termsType,
      title: terms?.title,
      content: terms?.content,
      version: terms?.version,
      acceptedAt: new Date().toISOString(),
      ipAddress: "", // Optionally set client IP if available
      userAgent:
        typeof window !== "undefined" ? window.navigator.userAgent : "",
    };

    try {
      const response = await fetch("/api/terms-conditions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        // Handle success (e.g., show a message or update state)
        console.log("Terms acceptance saved:");
      } else {
        // Handle error
        console.error("Failed to save terms acceptance:", data.error);
      }
    } catch (error) {
      console.error("API error:", error);
    }
  };

  const saveAnswer = async (
    questionId: string,
    answer: string,
    question: string,
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

  const handleSignDSuccess = async () => {
    setLoading(true);
    if (signDSessionData?.session_token) {
      try {
        await getResult(signDSessionData.session_token);
        await handleDownloadIDV(signDSessionData.session_token);
        // Proceed to next step after successfully getting result and downloading IDV
        //
        await generatePDF();
        nextStep();
      } catch (err) {
        console.error("Failed to get result:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDownloadIDV = async (token: string) => {
    try {
      const pdfBlob = await downloadIDV(token);
      const fileName = `signD-identity-verification-${session_id}.pdf`;
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const pdfSave = await fetch("/api/phase/save-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, pdfBase64: buffer }),
      });
      const pdfSaveResponse = await pdfSave.json();
      if (pdfSaveResponse?.success) {
        nextStep();
      } else {
        alert("Error saving PDF");
      }
    } catch (err) {
      console.error("Failed to download IDV:", err);
    }
  };

  const generatePDF = async () => {
    setLoading(true);

    try {
      // fetch existing product PDF (if one exists) and pass its bytes to generator
      // let existingPdfBytes: ArrayBuffer | undefined = undefined;
      // if (suggestedProduct?.fileName) {
      //   const existingPdfUrl = suggestedProduct.fileName.startsWith('http')
      //     ? suggestedProduct.fileName
      //     : `${process.env.NEXT_PUBLIC_FRONTEND_URL}${suggestedProduct.fileName}`;
      //   try {
      //     const resp = await fetch(existingPdfUrl);
      //     if (resp.ok) existingPdfBytes = await resp.arrayBuffer();
      //   } catch (err) {
      //     console.warn('Could not fetch existing product PDF:', err);
      //   }
      // }

      const pdf = await GenerateSimplePDF(questions, answers, {
        first_name: formik.values.firstName,
        last_name: formik.values.lastName,
        dob: formik.values.birthDate,
      }, 'A loan processor is a professional responsible for thoroughly examining loan applications, assessing credit standings, and finalizing loan contracts. They play an intermediary role between clients and financial institutions, ensuring timely loan approvals and protecting the organization’s credibility. With expertise in banking procedures and regulations, they analyze applicants’ eligibility and develop repayment plans while maintaining strong communication and sales skills. A loan processor acts as a key link in facilitating loan approvals and maintaining customer satisfaction.');

      // You can also convert to blob for upload to server
      const pdfBlob = pdf.output('blob');
      // uploadPDFToServer(pdfBlob);
      const base64 = await pdfBlobToBase64(pdfBlob);
      console.log("🚀 ~ generatePDF ~ base64:", base64)

      // const arrayBuffer = await pdfBlob.arrayBuffer();
      // const buffer = Buffer.from(arrayBuffer);

      const response = await fetch('/api/signteq/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: 'Test Document Signature',
          documentName: 'test_document.pdf',
          documentBase64: base64, // Remove data:application/pdf;base64, prefix
          recipientEmail: formik.values.email,
          recipientName: `${formik.values.firstName} ${formik.values.lastName}`,
          sessionId: session_id,
          signDSessionData: signDSessionData,
        }),
      });

      const data = await response.json();

      if (data.success && data.signing_url) {
        setSigningUrl(data.signing_url);
        setSignTeqRequestId(data.id);
        // Extract document ID from the response data
        if (data.data && data.data.documents && data.data.documents[0]) {
          setSignTeqDocumentId(data.data.documents[0].id);
        }
        console.log('✅ SignTeq session created:', {
          requestId: data.id,
          documentId: data.data?.documents?.[0]?.id,
          signingUrl: data.signing_url
        });
      } else {
        throw new Error(data.error || 'Failed to create SignTeq session');
      }
    } catch (error) {
      console.error("Error generating final PDF:", error);
    } finally {
      setLoading(false);
    }

    // Generate final PDF based on all collected data like confirm terms, Q&A, suggested product, personal info, and last signature section add
    // setLoading(true);
    // const pdf = await generateFinalPDF(
    //   termsAndConditions[0].content,
    //   termsAndConditions.length > 1 ? termsAndConditions[1].content : '',
    //   questions,
    //   answers,
    //   formik.values,
    //   suggestedProduct?.name || '',
    // )

    // // Existing PDF URL
    // const existingPdfUrl = `${process.env.NEXT_PUBLIC_FRONTEND_URL + 'products/' + suggestedProduct?.name + '.pdf'}`
    // console.log("🚀 ~ generatePDF ~ existingPdfUrl:", existingPdfUrl)

    // // Save the PDF
    // const fileName = `final_session_pdf_${session_id}.pdf`;

    // // pdf.save(fileName);

    // // You can also convert to blob for upload to server
    // const pdfBlob = pdf.output('blob');
    // // uploadPDFToServer(pdfBlob);

    // const arrayBuffer = await pdfBlob.arrayBuffer();
    // const buffer = Buffer.from(arrayBuffer);
    // const pdfSave = await fetch('/api/phase/save-pdf', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ fileName, pdfBase64: buffer })
    // });
    // const pdfSaveResponse = await pdfSave.json();
    // if (pdfSaveResponse?.success) {
    //   console.log("FInal PDF Path : ", process.env.NEXT_PUBLIC_FRONTEND_URL + pdfSaveResponse.fileUrl);
    // } else {
    //   alert('Error saving PDF');
    // }
    // try {
    //   const response = await fetch('/api/phase/generate-final-pdf', {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ sessionId: session_id })
    //   });
    //   const data = await response.json();
    //   if (data?.success) {
    //     nextStep();
    //   } else {
    //     alert('Error generating final PDF');
    //   }
    // } catch (error) {
    //   console.error('Error generating final PDF:', error);
    // } finally {
    //   setLoading(false);
    // }
  };

  // const saveSuggestionProduct = async () => {
  //   if (!suggestedProduct || !session_id) return;

  //   const payload = {
  //     qaSessionId: session_id,
  //     productId: suggestedProduct.name, // Use the actual product ID if available
  //     name: suggestedProduct.name,
  //     shortName: suggestedProduct.name,
  //     description: '', // Fill if available
  //     fileName: '', // Fill if available
  //     suggestionReason: '', // Fill if available
  //     confidenceScore: null, // Fill if available
  //     isConfirmed: false,
  //     confirmedAt: null
  //   };

  //   try {
  //     const response = await fetch('/api/phase/suggest-product', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify(payload),
  //     });
  //     const data = await response.json();
  //     if (data.success) {
  //       console.log('Suggested product saved:', data.data);
  //     } else {
  //       console.error('Failed to save suggested product:', data.error);
  //     }
  //   } catch (error) {
  //     console.error('API error:', error);
  //   }
  // };

  const handleSigningSuccess = async () => {
    console.log('✅ Document signed successfully!');
    setLoading(true);

    try {
      // Download the signed document if we have the document ID
      if (signTeqDocumentId) {
        console.log('📄 Downloading signed document...', signTeqDocumentId);

        const downloadResponse = await fetch(
          `/api/signteq/documents/${signTeqDocumentId}/download?type=completed`
        );
        const downloadData = await downloadResponse.json();

        if (downloadData.success) {
          // Save the downloaded document
          const saveResponse = await fetch('/api/signteq/save-document', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              base64Data: downloadData.base64,
              filename: `signed_document_${session_id}.pdf`,
              sessionId: session_id,
              documentId: signTeqDocumentId,
            }),
          });

          const saveData = await saveResponse.json();
          if (saveData.success) {
            setDownloadedDocumentPath(saveData.path);
            console.log('✅ Document saved successfully:', saveData.path);
          } else {
            console.error('❌ Failed to save document:', saveData.error);
          }
        } else {
          console.error('❌ Failed to download document:', downloadData.error);
        }
      }

      setSuccess(true);

      await fetch('/api/user/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session_id }),
      });

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

  // const resetTest = () => {
  //   setSigningUrl(null);
  //   setError(null);
  //   setSuccess(false);
  // };

  return (
    <div className={stepperContainerClass}>
      {/* Stepper Progress */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 lg:mb-8">
        {[...Array(9)].map((_, i) => (
          <div
            key={i}
            className={`${stepperBarClass} ${step > i ? "bg-blue-600" : "bg-gray-300"
              }`}
          ></div>
        ))}
      </div>
      {loading ? (
        <div className="flex items-center justify-center w-full h-32 sm:h-48 lg:h-64">
          <div className="text-gray-500 animate-pulse text-sm sm:text-base">Loading...</div>
        </div>
      ) : (
        <React.Fragment>
          <div className={cardClass}>
            <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 overflow-hidden">
              {step === PHASES.TERMS1 && (
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="mb-4 sm:mb-6 flex-shrink-0">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                      Terms and Conditions
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600">
                      Please read carefully before confirming
                    </p>
                  </div>

                  {/* Description Container */}
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6 flex-1 overflow-y-auto border border-gray-200 min-h-0">
                    <div className="prose prose-xs sm:prose-sm lg:prose max-w-none text-gray-700 space-y-3 sm:space-y-4">
                      {/* Render terms and conditions content here */}
                      <p>Die 4money Financial Services GmbH (kurz 4money) ist ein von der österreichischen Finanzmarktaufsicht (FMA) konzessioniertes Wertpapierdienstleistungsunternehmen (kurz WPDLU) gemäß §4 Abs. 1 WAG 2018. Das WPDLU ist zur Anlageberatung (gemäß § 3 Abs. 2 Z 1 & WAG 2018) und Annahme und Übermittlung von Aufträgen (§ 3 Abs 2 Z 3 WAG 2018) im Hinblick auf Fondsanteile (gemäß § 1 Z 7 lit c WAG 2018) auch über natürliche Personen gemäß §1 Z45 WAG 2018 berechtigt.</p>

                      <p>Das WPDLU ist nicht Mitglied einer Anleger:innenentschädigungseinrichtung, sondern über eine Vermögensschadenhaftpflichtversicherung mit einer Versicherungssumme von 1.500.000€ pro Jahr und 1.000.000€ pro Schadensfall abgesichert. Das Halten von Kund:innengeldern ist dem WPDLU gesetzlich untersagt.</p>

                      <p>Es wird darauf hingewiesen, dass das WPDLU lediglich über einen Geschäftsleiter verfügt. Das WPDLU bietet in Bezug auf Wertpapierdienstleistungen nicht unabhängige Vermittlung- bzw. Beratung auf Provisions- und/oder Honorarbasis an. Das WPDLU hat zwar eine breite Palette von Produkten, kann aber nicht den gesamten Markt abbilden. Eine umfassende Marktuntersuchung, welche sämtliche auf dem Markt befindliche Produkte beinhaltet ist daher nicht geschuldet. Eigenprodukte werden nicht angeboten.</p>

                      <p>Seitens des WPDLU besteht keine Pflicht Kund:innenportfolios laufend zu überwachen bzw. die Kund:innen über Veränderungen zu informieren. Daher ist es für das WPDLU nicht möglich laufend festzustellen ob bestimmte Produkte oder Wertpapierdienstleistungen weiterhin angemessen oder geeignet sind. Diesbezügliche Eignungstests können auch ohne Neuveranlagung auf Initiative der Kund:innen einmal jährlich unentgeltlich beim WPDLU gemacht werden.</p>

                      <p>Den Kund:innen wird das Angebot gemacht einmal pro Jahr die Geeignetheit der vermittelten Finanzinstrumente und der damit in Zusammenhang stehenden Portfoliostruktur zu überprüfen.</p>

                      <p>Gemäß Wertpapieraufsichtsgesetz 2018 ist das Wertpapierdienstleistungsunternehmen dazu verpflichtet von Kund:innen außer persönlichen Daten auch Informationen über finanzielle Verhältnisse, Kenntnisse und Erfahrungen im Wertpapierbereich, Risikoneigung und Anlageziele im Allgemeinen sowie Anlagezweck und Anlagedauer hinsichtlich der beabsichtigten Geschäfte einzuholen und aufzuzeichnen, um ordnungsgemäß beraten und geeignete Produkte vermitteln zu können. Dies soll eine gleichbleibend hohe Servicequalität für Kund:innen sicherstellen und dient nicht zuletzt auch zu deren Schutz.</p>

                      <p>Auch wenn manche Fragen sehr weit gehend erscheinen mögen, ist es zur Gewährleistung einer bestmöglichen Beratung gesetzlich zwingend erforderlich, dass alle Angaben richtig und vollständig sind. Gemäß Art. 54 Abs 8 del VO (EU) 2017/565 in Verbindung mit Richtlinie 2014/65 Artikel 25 Abs. 2 darf das WPDLU keine Anlageberatung machen oder eine Empfehlung für ein geeignetes Produkt abgeben, wenn nicht alle erforderlichen Informationen vorliegen. Treffen Angaben nicht mehr zu, sollten Kund:innen das Wertpapierdienstleistungsunternehmen unverzüglich darüber informieren, damit die Änderungen berücksichtigt werden können.</p>

                      <h2>Kontaktinformationen:</h2>
                      <ul>
                        <li><strong>Adresse:</strong> Einspinnergasse 1, A-8010 Graz</li>
                        <li><strong>Telefon:</strong> +43 (676) 92 00 670</li>
                        <li><strong>Email:</strong> <a href="mailto:office@4money.at">office@4money.at</a></li>
                        <li><strong>Website:</strong> <a href="https://www.4money.at" target="_blank">www.4money.at</a></li>
                      </ul>

                      <h2>Weitere Hinweise:</h2>
                      <p>Konzessioniertes Wertpapierdienstleistungsunternehmen gem. §4 Abs. 1 WAG 2018 | Firmenbuchgericht: LG f. ZRS Graz | FN 618973 f 02</p>

                      <p>Das WPDLU ist kein Steuerberater und überprüft nicht, ob die gewählte Anlageform, die steuerlich günstigste ist. Es wird empfohlen steuerliche Fragen zur Veranlagung mit einem Steuerberater zu besprechen. Das Wertpapierdienstleistungsunternehmen ist nicht befugt Zusicherungen zu geben oder Angaben zu machen, die von den Verkaufsunterlagen abweichen.</p>

                      <p>Das WPDLU stellt die vereinfachten Verkaufsprospekte bzw. die Basisinformationsblätter sowie alle sonstigen Gesprächsunterlagen kostenlos zur Verfügung. Grundsätzlich werden dem/der Kund:in die Informationen in elektronischer Form zur Verfügung gestellt, auf Anfrage der Kundin bzw. des Kunden werden diese auch in Papierform kostenlos zur Verfügung gestellt.</p>

                      <p>Anlageergebnisse in der Vergangenheit sind keine Garantie für zukünftige Ergebnisse. Bevor eine Entscheidung für eine bestimmte Anlage getroffen wird, sollten sich Kund:innen anhand der angebotenen Unterlagen und Informationen genau über Eigenheiten, Funktionsweisen und Risiken der Anlagen informieren und ggf. beim WPDLU nachfragen.</p>

                      <p>Die Daten von Kund:innen werden absolut vertraulich behandelt und ausschließlich im Sinne der gegenständlichen Kund:innenbeziehung verwendet. Gemäß § 8 WAG 2018 ist das WPDLU sowie für sie tätige Personen zur Verschwiegenheit verpflichtet. Die Verschwiegenheitspflicht darf nur in gesetzlich definierten (Ausnahme)fällen durchbrochen werden.</p>
                    </div>
                  </div>

                  {/* Status Message */}
                  {confirmed && (
                    <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-center animate-pulse flex-shrink-0">
                      <p className="text-sm sm:text-base">Thank you for confirming!</p>
                    </div>
                  )}
                </div>
              )}

              {step === PHASES.TERMS2 && (
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="mb-4 sm:mb-6 flex-shrink-0">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                      Nachhaltigkeitsrisiken
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600">
                      Please read carefully before confirming
                    </p>
                  </div>

                  {/* Description Container */}
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 lg:p-6 mb-4 sm:mb-6 flex-1 overflow-y-auto border border-gray-200 min-h-0">
                    <div className="prose prose-xs sm:prose-sm lg:prose max-w-none text-gray-700 space-y-3 sm:space-y-4">
                      {/* Render terms and conditions content here */}
                      <h4>Informationen zur Nachhaltigkeit im Zusammenhang mit der Abfrage von Nachhaltigkeitspräferenzen</h4>

                      <h4>Präambel</h4>
                      <p>Der europäische Aktionsplan für ein nachhaltiges Finanzsystem sieht vor, dass die europäische Finanzindustrie bei der Konzeption und dem Vertrieb von Finanzprodukten ökologische (Environment), soziale (Social) und verantwortungsvolle Unternehmensführungs- (Governance) Kriterien zu berücksichtigen hat (sogenannte ESG-Kriterien). Anleger:innen erhalten dadurch die Möglichkeit, nachhaltige Geldanlagen zu tätigen, indem ihnen transparent dargelegt wird, wie sich investiertes Kapital auf die Umwelt und Gesellschaft auswirkt.</p>

                      <h4>Übersicht: ESG Kriterien</h4>
                      <ul>
                        <li><strong>E - Umwelt (Environment)</strong></li>
                        <li><strong>S - Soziales (Social)</strong></li>
                        <li><strong>G - Unternehmensführung (Governance)</strong></li>
                      </ul>

                      <p>Um einen einheitlichen Standard zu schaffen, was als nachhaltige Geldanlage gilt, hat der Europäische Gesetzgeber die Offenlegungs-Verordnung<sup>1</sup> und die Taxonomie-Verordnung<sup>2</sup> erlassen. Die Offenlegungs-Verordnung definiert nachhaltige Investitionen im Allgemeinen, während die Taxonomie-Verordnung die Offenlegungs-Verordnung bezüglich ökologisch nachhaltige Investitionen konkretisiert.</p>

                      <p>In diesem Informationsblatt erhalten Sie Informationen zu den unterschiedlichen, rechtlichen Bedeutungen der Nachhaltigkeit, inwiefern Sie Nachhaltigkeitskriterien bei Ihrer Investition berücksichtigen können, und woran Sie erkennen können, in welchen Ausmaß Ihre Investition nachhaltig ist.</p>

                      <h4>1. Was gilt als nachhaltige Investition?</h4>
                      <p>Die Offenlegungs-Verordnung orientiert sich an den zuvor genannten ESG-Kriterien und legt fest, dass eine Investition dann als nachhaltig gilt, wenn:</p>

                      <ul>
                        <li><strong>E</strong> - die Investition zur Erreichung eines Umweltziels beiträgt (siehe hierzu Punkt 2. zu ökologisch nachhaltigen Investitionen) <strong>oder</strong></li>
                        <li><strong>S</strong> - die Investition zur Erreichung eines sozialen Ziels beiträgt, insbesondere eine Investition, die zur Bekämpfung von Ungleichheiten beiträgt oder den sozialen Zusammenhalt, die soziale Integration und die Arbeitsbeziehungen fördert oder eine Investition in Humankapital oder zugunsten wirtschaftlich oder sozial benachteiligter Bevölkerungsgruppen <strong>und</strong> die Investition kein Umweltziel oder soziales Ziel erheblich beeinträchtigt <strong>und</strong></li>
                        <li><strong>G</strong> - die Unternehmen, in die investiert wird, Verfahrensweisen einer guten Unternehmensführung anwenden, insbesondere bei soliden Managementstrukturen, den Beziehungen zu den Arbeitnehmern, der Vergütung von Mitarbeiter:innen sowie der Einhaltung der Steuervorschriften.</li>
                      </ul>

                      <h4>2. Was gilt als ökologisch nachhaltige Investition?</h4>
                      <p>Nach der Taxonomie-Verordnung gilt eine Investition in eine wirtschaftliche Tätigkeit dann als ökologisch nachhaltig, wenn</p>

                      <ul>
                        <li>die wirtschaftliche Tätigkeit zumindest einem Umweltziel dient und einen wesentlichen Beitrag zur Erreichung dieses Ziels leistet,</li>
                        <li>die wirtschaftliche Tätigkeit nicht gleichzeitig zu einer erheblichen Beeinträchtigung eines oder mehrerer Umweltziele führt,</li>
                        <li>die wirtschaftliche Tätigkeit unter Einhaltung des festgelegten Mindestschutzes ausgeübt wird (betrifft Menschen- und Arbeitnehmerrechte, Leitsätze in der Unternehmensführung etc.), sowie</li>
                        <li>dabei die entsprechenden technischen Vorgaben, die an Kennzahlen gemessen werden, eingehalten werden (z.B. Schwellenwerte für Emissionen oder CO2-Fußabdruck).</li>
                      </ul>

                      <p>Sind diese Punkte erfüllt, handelt es sich um eine ökologisch nachhaltige Investition. Die Taxonomie-Verordnung nennt dabei sechs Umweltziele.</p>

                      <h4>Sechs Umweltziele</h4>

                      <h4>1. Klimaschutz:</h4>
                      <p>Darunter versteht man Beiträge zur Stabilisierung von Treibhausgasemissionen, also eine Vorgehensweise, die den Anstieg der durchschnittlichen Erdtemperatur auf deutlich unter 2 °C zu halten versucht. Da es einige Wirtschaftstätigkeiten gibt, die sich negativ auf die Umwelt auswirken, kann ein wesentlicher Beitrag zu einem Umweltziel auch darin bestehen, solche negativen Auswirkungen zu verringern. Beispiele hierfür sind der Ausbau klimaneutraler Mobilität oder die Erzeugung sauberer Kraftstoffe aus erneuerbaren Quellen.</p>

                      <h4>2. Anpassung an den Klimawandel:</h4>
                      <p>Darunter versteht man Tätigkeiten, welche nachteilige Auswirkungen des derzeitigen oder künftigen Klimas oder die Gefahr nachteiliger Auswirkungen auf die Tätigkeit selbst, Menschen, die Natur oder Vermögenswerte verringern oder vermeiden soll.</p>

                      <h4>3. Die nachhaltige Nutzung und der Schutz von Wasser- und Meeresressourcen:</h4>
                      <p>Hierzu zählt z.B. der Schutz vor den nachteiligen Auswirkungen der Einleitung von städtischem und industriellem Abwasser.</p>

                      <h4>4. Der Übergang zu einer Kreislaufwirtschaft:</h4>
                      <p>Recycling, aber auch die Verbesserung der Haltbarkeit und Reparaturfähigkeit von Produkten.</p>

                      <h4>5. Vermeidung und Verminderung der Umweltverschmutzung:</h4>
                      <p>z.B. Verbesserung der Luft-, Wasser- oder Bodenqualität in den Gebieten, in denen die Wirtschaftstätigkeit stattfindet, aber auch die Beseitigung von Abfall.</p>

                      <h4>6. Der Schutz und die Wiederherstellung der Artenvielfalt (Biodiversität) und der Ökosysteme:</h4>
                      <p>Gemeint sind hier unter anderem nachhaltige Landnutzung und -bewirtschaftung oder die nachhaltige Waldbewirtschaftung.</p>

                      <h4>3. Berücksichtigung von ökologischen, sozialen und ethischen Nachhaltigkeitskriterien bei Ihrer Investition</h4>
                      <p>Im Zuge einer Anlageberatung sind wir als Anlageberater:in verpflichtet, zu erheben, ob und inwiefern wir bei der Veranlagung Ihres Kapitals die Nachhaltigkeit von Finanzinstrumenten berücksichtigen sollen.</p>

                      <h4>Bei dieser Erhebung können Sie zunächst folgende Angaben zu Ihrer Nachhaltigkeitspräferenz machen:</h4>
                      <ol type="a">
                        <li>Sie präferieren ökologisch nachhaltige Finanzinstrumente im Sinne der Taxonomie-Verordnung (siehe Punkt 2.).</li>
                        <li>Sie präferieren (insbesondere sozial und unternehmerisch) nachhaltige Finanzinstrumente im Sinne der Offenlegungsverordnung (siehe Punkt 1.).</li>
                        <li>Sie präferieren Finanzinstrumente, die weder als ökologisch nachhaltig im Sinne der Taxonomie-Verordnung noch als nachhaltig im Sinne der Offenlegungs-Verordnung eingestuft werden, bei denen aber die für Sie wichtigsten nachteiligen Auswirkungen auf Nachhaltigkeitsfaktoren berücksichtigt werden. Als Nachhaltigkeitsfaktoren gelten Umwelt-, Sozial- und Arbeitnehmerbelange, die Achtung der Menschenrechte und die Bekämpfung von Korruption und Bestechung.</li>
                        <li>Sie präferieren eine Kombination aus den vorgenannten Finanzinstrumenten.</li>
                        <li>Sie haben keine Präferenz für nachhaltige Finanzinstrumente.</li>
                      </ol>

                      <p>Anschließend können Sie bei Vorliegen einer Präferenz auch angeben, welchen Mindestanteil diese Investition ausmachen soll, sowie welche Parameter (z.B. quantitative Werte) herangezogen werden sollen, um die nachteiligen Auswirkungen auf Nachhaltigkeitsfaktoren zu ermitteln. Derartige Parameter können etwa Indikatoren aus dem Umweltbereich (z.B. Energieintensität eines Unternehmens/einer Branche, CO2-Fußabdruck usw.) oder Indikatoren aus dem gesellschaftlichen Bereich (z.B. Gender-Diversity im Vorstand, Umgang mit kontroversen Waffen usw.) sein.</p>

                      <p>Wenn Sie Nachhaltigkeitspräferenzen nennen, wird Ihnen ein Finanzprodukt empfohlen, welches Ihren Nachhaltigkeitspräferenzen (Offenlegungs-Verordnung, Taxonomie-Verordnung und/oder nachteilige Auswirkungen auf Nachhaltigkeitsfaktoren) entspricht.</p>

                      <h4>4. Wie erkenne ich, ob eine Investition diesen Nachhaltigkeitskriterien entspricht?</h4>
                      <p>Wir dürfen Ihnen als Anlageberater:in nur Investitionen empfehlen, die Ihren Präferenzen entsprechen. Dies gilt für alle Finanzinstrumente und auch konkret i.Z.m. Ihren Nachhaltigkeitspräferenzen.</p>

                      <p>Zusätzlich dazu normieren die Offenlegungs- und die Taxonomie-Verordnung für Finanzmarktteilnehmer, bspw. Hersteller und Anbieter von Finanzprodukten, und Finanzberater umfassende Offenlegungspflichten zu Nachhaltigkeitsrisiken. Diese umfassen insbesondere die Art und Weise, wie Nachhaltigkeitsrisiken bei ihren Investitionsentscheidungen bzw. bei ihrer Beratung einbezogen werden und die Ergebnisse der Bewertung der zu erwartenden Auswirkungen von Nachhaltigkeitsrisiken auf die Rendite von Finanzprodukten, die sie zur Verfügung stellen bzw. die von ihnen beraten werden.</p>

                      <p>Darüber hinaus sind Finanzmarktteilnehmer und Finanzberater bei gewissen Finanzprodukten, die gemäß den Verordnungen als nachhaltig und ökologisch nachhaltig bezeichnet werden dürfen, verpflichtet, weitere Informationen zu diesen Finanzprodukten auf deren Internetseiten offenzulegen. Diese zusätzlichen Informationspflichten betreffen aber nur folgende Finanzprodukte: Verwaltete Wertpapierportfolios, Investmentfonds (OGAW), alternative Investmentfonds (AIF), Versicherungsanlageprodukte (IBIPs), Paneuropäische Private Pensionsprodukte (PEPPs) sowie Altersvorsorgeprodukte und -systeme.</p>

                      <h4>Für diese Finanzprodukte gibt es drei Kategorien:</h4>

                      <h4>a) Dunkelgrüne Finanzprodukte (Art 9)</h4>
                      <p>Finanzprodukte, die eine nachhaltige Investition anstreben - bei diesen Finanzprodukten ist die Nachhaltigkeit am stärksten sichergestellt und die Informationspflichten am umfangreichsten.</p>

                      <h4>b) Hellgrüne Finanzprodukte (Art 8)</h4>
                      <p>Finanzprodukte, die ökologische oder soziale (oder eine Kombination beider) Merkmale bewerben. Bei diesen Finanzprodukten werden ökologische oder soziale Merkmale lediglich berücksichtigt, während dunkelgrüne Finanzprodukte ein Umweltziel explizit anstreben.</p>

                      <h4>Sonstige Finanzprodukte</h4>
                      <p>Finanzprodukte, die Nachhaltigkeitskriterien gemäß Offenlegungs- bzw. Taxonomie-Verordnung nicht oder in geringem Umfang berücksichtigen.</p>

                      <p><strong>ACHTUNG:</strong> Diese zusätzlichen Informationspflichten gelten nur für gewisse Finanzinstrumente. Andere Finanzinstrumente, wie z.B. Unternehmensanleihen, lösen diese zusätzlichen Informationspflichten nicht aus. Unabhängig davon werden Ihre Nachhaltigkeitspräferenzen aber bei allen Finanzinstrumenten, die wir Ihnen empfehlen, berücksichtigt.</p>

                      <h4>Fazit</h4>
                      <p>Der Begriff der Nachhaltigkeit deckt im europäischen Rechtsrahmen verschiedene Aspekte ab - insbesondere ökologische, soziale und unternehmerische Nachhaltigkeit. In welchem Ausmaß und in welcher Ausprägung die Nachhaltigkeit bei den Finanzprodukten im Rahmen der Anlageberatung berücksichtigt wird, hängt von Ihren Präferenzen ab, die Sie Ihrem/Ihrer Anlageberater:in bei Ihrem Beratungsgespräch offenlegen.</p>

                      <p><strong>Wenn Sie uns Nachhaltigkeitspräferenzen nennen</strong>, empfehlen wir Ihnen im Rahmen der Anlageberatung nur Finanzinstrumente, die Ihren konkreten Nachhaltigkeitspräferenzen entsprechen.</p>

                      <p><strong>Wenn Sie uns keine Nachhaltigkeitspräferenzen nennen</strong>, stufen wir Sie als nachhaltigkeitsneutral ein. Das heißt, dass wir in die Eignungsbeurteilung bzw. in die Auswahl jener Finanzinstrumente, die wir Ihnen gegebenenfalls empfehlen oder im Rahmen der Portfolioverwaltung einsetzen, Ihre sonstigen Anlagepräferenzen (z.B. Risikotoleranz, Erfahrungen und Kenntnisse, Vermögensverhältnisse) einbeziehen. Die Nachhaltigkeit ist dann allerdings kein Auswahl- bzw. Ausschlusskriterium.</p>

                      <p>Als Anlageberater:in beziehen wir die Informationen über die Nachhaltigkeit in Finanzinstrumenten aus den offengelegten Informationen der jeweiligen Produkthersteller, z.B. aus den regelmäßigen Berichten zu den Finanzinstrumenten. Diese sind auch für Sie, z.B. auf den jeweiligen Internetseiten der Produktanbieter, einsehbar. Dort finden Sie unter anderem eine Beschreibung der ökologischen oder sozialen Merkmale oder des nachhaltigen Investitionsziels, Angaben zu den Methoden, die angewandt werden, um die ökologischen oder sozialen Merkmale der für das Finanzprodukt ausgewählten nachhaltigen Investitionen zu bewerten, zu messen und zu überwachen sowie Informationen über die wichtigsten nachteiligen Auswirkungen auf die Nachhaltigkeitsfaktoren von Finanzinstrumenten. Bedenken Sie, dass es sich dabei um Informationen handeln kann, die sich auf Zeiträume beziehen, die in der Vergangenheit liegen.</p>

                      <hr/>
                    </div>
                  </div>

                  {/* Status Message */}
                  {confirmed && (
                    <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-center animate-pulse flex-shrink-0">
                      <p className="text-sm sm:text-base">Thank you for confirming!</p>
                    </div>
                  )}
                </div>
              )}

              {step === PHASES.QUESTIONS1 && (
                <div className="w-full h-full flex items-center justify-center p-4 sm:p-6 md:p-8">
                  <QuestionCard
                    step={questionIndex}
                    totalSteps={3}
                    // title={currentQ?.title}
                    // subtitle={currentQ?.subtitle}
                    question={currentQ?.text}
                    questionText={currentQ?.text}
                    options={
                      currentQ?.options?.length
                        ? currentQ.options.map((opt) => ({
                          label: opt.label,
                          value: opt.value,
                        }))
                        : undefined
                    }
                    selected={answers[currentQ?.id]}
                    onSelect={async (opt) => {
                      setAnswers({ ...answers, [currentQ?.id]: opt });
                      await saveAnswer(
                        currentQ?.id,
                        opt,
                        currentQ?.text,
                        currentQ?.options
                      );
                    }}
                  // onNext={() => questionIndex === 3 ? lastQuestionNext() : setQuestionIndex((s) => Math.min(s + 1, 3))}
                  // onBack={() => setQuestionIndex((s) => Math.max(s - 1, 1))}
                  />
                </div>
              )}

              {step === PHASES.QUESTIONS2 && (
                <div className="w-full h-full flex items-center justify-center p-4 sm:p-6 md:p-8">
                  <QuestionCard
                    step={questionIndex}
                    totalSteps={2}
                    // title={currentQ2?.title}
                    // subtitle={currentQ2?.subtitle}
                    question={currentQ2?.text}
                    questionText={currentQ2?.text}
                    options={
                      currentQ2?.options?.length
                        ? currentQ2.options.map((opt) => ({
                          label: opt.label,
                          value: opt.value,
                        }))
                        : undefined
                    }
                    selected={answers[currentQ2?.id]}
                    onSelect={async (opt) => {
                      setAnswers({ ...answers, [currentQ2?.id]: opt });
                      await saveAnswer(
                        currentQ2?.id,
                        opt,
                        currentQ2?.text,
                        currentQ2?.options
                      );
                    }}
                  // onNext={() => questionIndex === 2 ? lastQuestionNext() : setQuestionIndex((s) => Math.min(s + 1, 2))}
                  // onBack={() => setQuestionIndex((s) => Math.max(s - 1, 1))}
                  />
                </div>
              )}

              {step === PHASES.SUGGESTIONS && (
                <div className="w-full h-full flex flex-col">
                  <div className="flex-1 p-4 sm:p-6 md:p-8 flex flex-col">
                    <div className="max-w-4xl mx-auto w-full flex flex-col h-full">
                      {/* <div className="text-center mb-4 sm:mb-6 flex-shrink-0">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4">Suggested Product</h2>
                        <p className="text-sm sm:text-base text-gray-600">
                          Based on your answers, we recommend the following investment product:
                        </p>
                      </div> */}

                      <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
                        {/* Product Header */}
                        {/* <div className="p-4 sm:p-6 border-b border-gray-100">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                          {suggestedProduct?.fullName ||
                            suggestedProduct?.name ||
                            "Recommended Investment Product"}
                        </h3>
                        {suggestedProduct?.description && (
                          <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                            {suggestedProduct.description}
                          </p>
                        )}
                      </div> */}

                        {/* Product Document */}
                        <div className="p-4 sm:p-6 flex-1 flex flex-col">
                          <div className="w-full border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex-1 min-h-[300px] flex flex-col">
                            {suggestedProduct?.fileName ? (
                              <iframe
                                src={
                                  suggestedProduct.fileName.startsWith("http")
                                    ? suggestedProduct.fileName
                                    : `${process.env.NEXT_PUBLIC_FRONTEND_URL}${suggestedProduct.fileName}`
                                }
                                className="w-full flex-1 h-full"
                                title="Product Information Document"
                              />
                            ) : (
                              <div className="w-full flex-1 flex flex-col items-center justify-center text-gray-500 p-6">
                                <svg className="w-12 h-12 sm:w-16 sm:h-16 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-sm sm:text-base font-medium mb-2">No product document available</p>
                                <p className="text-xs sm:text-sm text-gray-400">Product information will be provided separately</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
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
                  />
                </div>
              )}

              {step === PHASES.PERSONAL_INFO && (
                <div className="w-full h-full flex flex-col">
                  <div className="flex-1 overflow-y-auto">
                    <div className="container mx-auto p-4 sm:p-6 md:p-8 max-w-4xl">
                      {/* <h1 className="text-xl font-bold text-center mb-6">Personal Information Form</h1> */}
                      <PersonalInfoForm formik={formik} />
                    </div>
                  </div>
                </div>
              )}

              {step === PHASES.SIGN_DOCUMENT && (
                <div className="w-full h-full flex flex-col">
                  <div className="flex-1 p-4 sm:p-6 md:p-8 flex flex-col">
                    <div className="max-w-4xl mx-auto w-full flex flex-col h-full">
                      {/* <div className="text-center mb-4 sm:mb-6 flex-shrink-0">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4">Identity Verification</h2>
                        <p className="text-sm sm:text-base text-gray-600">
                          Please complete the identity verification process to continue
                        </p>
                      </div> */}

                      {/* <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0"> */}
                        <SignDIframe
                          src={getIframeUrl(
                            signDSessionData?.session_token ?? "",
                            "en",
                            formik.values.magicFlow
                          )}
                          onSuccess={handleSignDSuccess}
                          onError={(error) => setError(error?.description)}
                          onUserCanceled={prevStep}
                          // onSignatureToken={(token) => handleDownloadIDV(token)}
                          className="w-full flex-1 min-h-[400px] h-full rounded-lg border border-gray-200"
                          onEvent={(e) => {
                            console.log("Event : ", JSON.stringify(e));
                          }}
                        />

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
                                  Verification Error
                                </h4>
                                <p className="text-sm text-red-700">
                                  {error}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      {/* </div> */}
                    </div>
                  </div>
                </div>
              )}

              {/* {step === PHASES.RESULT_PDF && (
              <div className="w-full h-full">
                <h2 className="text-xl font-bold mb-4">Final Result</h2>
                <p className="text-gray-600 mb-6">
                  Thank you for completing the process. You can download your
                  final document below.
                </p>
                <div
                  className="border p-4 rounded shadow"
                  style={{ height: "85%" }}
                >
                  {finalPDFUrl ? (
                    <iframe
                      src={finalPDFUrl}
                      className="w-full rounded"
                      style={{ height: "85%" }}
                    />
                  ) : (
                    <div
                      className="w-full rounded bg-gray-100 flex items-center justify-center"
                      style={{ height: "90%" }}
                    >
                      <p className="text-gray-500">
                        Final PDF is not available at the moment.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div> */}

              {step === PHASES.RESULT_PDF && (
                <div className="w-full h-full flex flex-col">
                  <div className="flex-1 p-0 sm:p-0 md:p-0 flex flex-col">
                    <div className="max-w-4xl mx-auto w-full flex flex-col h-full">
                      {/* <div className="text-center mb-4 sm:mb-6 flex-shrink-0">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 sm:mb-4">Document Ready for Signature</h2>
                        <p className="text-sm sm:text-base text-gray-600">
                          Thank you for completing the process. You can sign the document below.
                        </p>
                      </div> */}

                      {/* <div className="bg-white border border-gray-200 rounded-lg sm:rounded-xl shadow-sm overflow-hidden flex-1 flex flex-col min-h-0"> */}
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
                              Document Signed Successfully!
                            </h3>

                            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                              Your document has been signed and processed successfully.
                            </p>

                            {loading && (
                              <div className="mb-4 sm:mb-6">
                                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-500 mx-auto mb-3">
                                </div>
                                <p className="text-xs sm:text-sm text-gray-500">
                                  Downloading and saving signed document...
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
                                      ✅ Signed document saved successfully!
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
                                      View Signed Document
                                    </a>
                                  </div>
                                </div>
                              </div>
                            )}

                            <p className="text-xs sm:text-sm text-gray-500 mb-6 sm:mb-8">
                              Redirecting to success page...
                            </p>

                            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                              <button
                                onClick={() => router.push('/customer/success')}
                                className="w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium text-sm sm:text-base"
                              >
                                Go to Success Page
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* </div> */}
                    </div>
                  </div>
                </div>
                // </div>
              )}
            </div>

            {/* Navigation */}
            {/* <div className="flex justify-center my-3">
              <p className="text-gray-600">Step {step} of 9</p>
            </div> */}
            {/* <div className="flex justify-between mt-3">
              <button
                onClick={prevStep}
                disabled={step === PHASES.TERMS1}
                className={buttonBackClass}
              >
                Back
              </button>
              <div className="flex justify-end">
                {step === PHASES.TERMS1 || step === PHASES.TERMS2 ? (
                  <button
                    onClick={handleConfirm}
                    disabled={confirmed}
                    className={`${buttonBaseClass} ${confirmed ? buttonConfirmedClass : buttonConfirmClass} disabled:cursor-not-allowed`}
                  >
                    {confirmed ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Confirmed!
                      </>
                    ) : (
                      'I Confirm'
                    )}
                  </button>
                ) : (step === PHASES.QUESTIONS1 || step === PHASES.QUESTIONS2 || step === PHASES.PERSONAL_INFO) ? null : (
                  <button
                    onClick={step < PHASES.RESULT_PDF ? nextStep : backDashboard}
                    className={`${buttonBaseClass} ${buttonNextClass}`}
                  >
                    {step === PHASES.RESULT_PDF ? 'Finish' : 'Next'}
                  </button>
                )}
              </div>
            </div> */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 sm:gap-0 mt-4 sm:mt-6 p-4 sm:p-6 bg-gray-50 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={() => {
                  if (step === PHASES.QUESTIONS1 || step === PHASES.QUESTIONS2) {
                    if (questionIndex === 1) {
                      prevStep(); // Go to previous phase
                    } else {
                      setQuestionIndex((s) => s - 1);
                    }
                  } else {
                    prevStep();
                  }
                }}
                disabled={step === PHASES.TERMS1}
                className={`${buttonBaseClass} ${buttonBackClass} order-2 sm:order-1 w-full sm:w-auto`}
              >
                <span>Back</span>
              </button>
              <div className="flex justify-end order-1 sm:order-2">
                {step === PHASES.TERMS1 || step === PHASES.TERMS2 ? (
                  <button
                    onClick={handleConfirm}
                    disabled={confirmed}
                    className={`${buttonBaseClass} ${confirmed ? buttonConfirmedClass : buttonConfirmClass
                      } disabled:cursor-not-allowed w-full sm:w-auto`}
                  >
                    {confirmed ? (
                      <>
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="hidden sm:inline">Confirmed!</span>
                        <span className="sm:hidden">✓</span>
                      </>
                    ) : (
                      <span>I Confirm</span>
                    )}
                  </button>
                ) : step === PHASES.QUESTIONS1 ||
                  step === PHASES.QUESTIONS2 ||
                  step === PHASES.PERSONAL_INFO ? (
                  <button
                    onClick={() => {
                      if (step === PHASES.QUESTIONS1) {
                        if (questionIndex === 3) {
                          lastQuestionNext();
                        } else {
                          setQuestionIndex((s) => Math.min(s + 1, 3));
                        }
                      } else if (step === PHASES.QUESTIONS2) {
                        if (questionIndex === 2) {
                          lastQuestionNext();
                        } else {
                          setQuestionIndex((s) => Math.min(s + 1, 2));
                        }
                      } else {
                        formik.handleSubmit();
                      }
                    }}
                    disabled={
                      (step === PHASES.QUESTIONS1 && !answers[currentQ?.id]) ||
                      (step === PHASES.QUESTIONS2 && !answers[currentQ2?.id])
                    }
                    className={`${buttonBaseClass} ${buttonNextClass} disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto`}
                    type={step === PHASES.PERSONAL_INFO ? "submit" : "button"}
                  >
                    <span>Next</span>
                  </button>
                ) : step === PHASES.RESULT_PDF ? null : (
                  <button
                    onClick={step < PHASES.RESULT_PDF ? nextStep : backDashboard}
                    className={`${buttonBaseClass} ${buttonNextClass} w-full sm:w-auto`}
                  >
                    <span>{step === PHASES.RESULT_PDF ? 'Finish' : 'Next'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </React.Fragment>
      )}
    </div>
  );
}
