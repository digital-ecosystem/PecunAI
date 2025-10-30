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
import "./index.css";
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
import { generateFinalPDF } from "@/utils/pdfGenerator";

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
  "max-w-full p-6 bg-gradient-to-br from-blue-50 to-indigo-100 min-h-[100vh] flex flex-col justify-center";
const cardClass =
  "flex items-center justify-center w-full max-w-full h-[82vh] p-8 bg-white rounded-2xl shadow-xl";
const buttonBaseClass =
  "flex items-center gap-2 px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform shadow-lg hover:shadow-xl";
const buttonConfirmClass =
  "bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 active:scale-95";
const buttonConfirmedClass = "bg-green-500 text-white scale-95";
const buttonNextClass =
  "bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 active:scale-95";
const buttonBackClass =
  "px-4 py-2 rounded-lg border text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-40";

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [finalPDFUrl, setFinalPDFUrl] = useState<string | null>(null);

  const session_id = searchParams.get("session_id");

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
      console.error("API error:", error);
    }
    const payload: Omit<SignDHandshakePayload, "login" | "token"> = {
      type: "identification",
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
      let existingPdfBytes: ArrayBuffer | undefined = undefined;
      if (suggestedProduct?.fileName) {
        const existingPdfUrl = suggestedProduct.fileName.startsWith("http")
          ? suggestedProduct.fileName
          : `${process.env.NEXT_PUBLIC_FRONTEND_URL}${suggestedProduct.fileName}`;
        try {
          const resp = await fetch(existingPdfUrl);
          if (resp.ok) existingPdfBytes = await resp.arrayBuffer();
        } catch (err) {
          console.warn("Could not fetch existing product PDF:", err);
        }
      }

      const mergedBytes = await generateFinalPDF(
        termsAndConditions?.[0]?.content || "",
        termsAndConditions.length > 1 ? termsAndConditions[1].content : "",
        questions,
        answers,
        formik.values,
        suggestedProduct?.name || "",
        existingPdfBytes
      );

      const fileName = `final_session_pdf_${session_id}.pdf`;
      // ensure we pass an ArrayBuffer (slice to avoid SharedArrayBuffer issues)
      const mergedCopy = new Uint8Array(mergedBytes); // copy to ensure ArrayBuffer compatibility
      const blob = new Blob([mergedCopy], { type: "application/pdf" });

      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const pdfSave = await fetch("/api/phase/save-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, pdfBase64: buffer }),
      });
      const pdfSaveResponse = await pdfSave.json();
      if (pdfSaveResponse?.success) {
        setFinalPDFUrl(
          process.env.NEXT_PUBLIC_FRONTEND_URL + pdfSaveResponse.fileUrl
        );
      } else {
        alert("Error saving PDF");
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

  return (
    <div className={stepperContainerClass}>
      {/* Stepper Progress */}
      <div className="flex items-center justify-between mb-8">
        {[...Array(9)].map((_, i) => (
          <div
            key={i}
            className={`${stepperBarClass} ${step > i ? "bg-blue-600" : "bg-gray-300"
              }`}
          ></div>
        ))}
      </div>
      {loading ? (
        <div className="flex items-center justify-center w-full h-64">
          <div className="text-gray-500 animate-pulse">Loading...</div>
        </div>
      ) : (
        <React.Fragment>
          {/* Stepper Content */}
          <div className={cardClass}>
            {step === PHASES.TERMS1 && (
              <div>
                {/* Header */}
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Terms and Conditions
                  </h1>
                  <p className="text-gray-600">
                    Please read carefully before confirming
                  </p>
                </div>

                {/* Description Container */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6 max-h-96 overflow-y-auto border border-gray-200">
                  <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
                    {/* Render terms and conditions content here */}
                    <p>
                      Die 4money Financial Services GmbH (kurz 4money), mit der Geschäftsanschrift Einspinnergasse 1/3.OG, 8010 Graz,
ist ein von der österreichischen Finanzmarktaufsicht (FMA) konzessioniertes Wertpapierdienstleistungsunternehmen
(kurz WPDLU) gemäß §4 Abs. 1 WAG 2018. Das WPDLU ist zur Anlageberatung (gemäß § 3 Abs. 2 Z 1 & WAG 2018)
und Annahme und Übermittlung von Aufträgen (§ 3 Abs 2 Z 3 WAG 2018) im Hinblick auf Fondsanteile (gemäß § 1 Z
7 lit c WAG 2018) auch über natürliche Personen gemäß §1 Z45 WAG 2018 berechtigt. Das WPDLU ist nicht Mitglied
einer Anleger:innenentschädigungseinrichtung, sondern über eine Vermögensschadenhaftpflichtversicherung mit
einer Versicherungssumme von 1.500.000€ pro Jahr und 1.000.000€ pro Schadensfall abgesichert. Das Halten von
Kund:innengeldern ist dem WPDLU gesetzlich untersagt.
Es wird darauf hingewiesen, dass das WPDLU lediglich über einen Geschäftsleiter verfügt. Das WPDLU bietet in Bezug
auf Wertpapierdienstleistungen nicht unabhängige Vermittlung- bzw. Beratung auf Provisions- und/oder Honorarbasis
an. Das WPDLU hat zwar eine breite Palette von Produkten, kann aber nicht den gesamten Markt abbilden. Eine
umfassende Marktuntersuchung, welche sämtliche auf dem Markt befindliche Produkte beinhaltet ist daher nicht
geschuldet. Eigenprodukte werden nicht angeboten.
Seitens des WPDLU besteht keine Pflicht Kund:innenportfolios laufend zu überwachen bzw. die Kund:innen
über Veränderungen zu informieren. Daher ist das für das WPDLU nicht möglich laufend festzustellen ob
bestimmte Produkte oder Wertpapierdienstleistungen weiterhin angemessen oder geeignet sind. Diesbezügliche
Eignungstests können auch ohne Neuveranlagung auf Initiative der Kund:innen einmal jährlich unentgeltlich beim
WPDLU gemacht werden. Den Kund:innen wird das Angebot gemacht einmal pro Jahr die Geeignetheit der vermittelten
Finanzinstrumente und der damit in Zusammenhang stehenden Portfoliostruktur zu überprüfen.
Gemäß Wertpapieraufsichtsgesetz 2018 ist das Wertpapierdienstleistungsunternehmen dazu verpflichtet von
Kund:innen außer persönlichen Daten auch Informationen über finanziellen Verhältnisse, Kenntnisse und Erfahrungen
im Wertpapierbereich, Risikoneigung und Anlageziele im allgemeinen sowie Anlagezweck und Anlagedauer hinsichtlich
der beabsichtigten Geschäfte einzuholen und aufzuzeichnen, um ordnungsgemäß beraten und geeignete Produkte
vermitteln zu können. Dies soll eine gleichbleibend hohe Servicequalität für Kund:innen sicherstellen und dient nicht zuletzt
auch zu deren Schutz. Auch wenn manche Fragen sehr weit gehend erscheinen mögen, ist es zur Gewährleistung einer
bestmöglichen Beratung gesetzlich zwingend erforderlich, dass alle Angaben richtig und vollständig sind. Gemäß Art. 54
Abs 8 del VO (EU) 2017/565 in Verbindung mit Richtlinie 2014/65 Artikel 25 Abs. 2 darf das WPDLU keine Anlageberatung
machen oder eine Empfehlung für ein geeignetes Produkt abgeben, wenn nicht alle erforderlichen Informationen vorliegen.
Treffen Angabe nicht mehr zu, sollten Kund:innen das Wertpapierdienstleistungsunternehmen unverzüglich darüber
informieren, damit die Änderungen berücksichtigt werden können.
                      {/*termsAndConditions?.[
                          step === PHASES.TERMS1
                            ? 0
                            : (termsAndConditions.length > 1 ? 1 : 0)]?.content
                          || 'No terms and conditions available.'*/}
                    </p>
                  </div>
                </div>

                {/* Status Message */}
                {confirmed && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-center animate-pulse">
                    Thank you for confirming!
                  </div>
                )}
              </div>
            )}

            {step === PHASES.TERMS2 && (
              <div>
                {/* Header */}
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Nachhaltigkeitsrisiken
                  </h1>
                  <p className="text-gray-600">
                    Please read carefully before confirming
                  </p>
                </div>

                {/* Description Container */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6 max-h-96 overflow-y-auto border border-gray-200">
                  <div className="prose prose-sm max-w-none text-gray-700 space-y-4">
                    {/* Render terms and conditions content here */}
                    <p>
<<<<<<< HEAD
                     Nachhaltigkeitsrisiken
Umgang der 4money mit Nachhaltigkeitsrisiken
Die 4money berücksichtigt Nachhaltigkeitsrisiken im Rahmen der Anlageberatung in der Regel nur auf ausdrücklichen
Kund:innenwunsch. Ohne einen solchen Kund:innenwunsch berücksichtigt die 4money daher bei der Erbringung der
Wertpapierdienstleistungen keine Nachhaltigkeitsrisiken. Dies erfolgt aus Verhältnismäßigkeitserwägungen sowie aus der
Überlegung, dass mit den Anlageempfehlungen in erster Linie die vermögensrechtlichen Interessen der Kund:innen zu
wahren sind.
Informationen zur Nachhaltigkeit im Zusammenhang mit der Abfrage von Nachhaltigkeitspräferenzen
Präambel
Der europäische Aktionsplan für ein nachhaltiges Finanzsystem sieht vor, dass die europäische Finanzindustrie bei der
Konzeption und dem Vertrieb von Finanzprodukten ökologische (Environment), soziale (Social) und verantwortungsvolle
Unternehmensführungs- (Governance) Kriterien zu berücksichtigen hat (sogenannte ESG-Kriterien). Anleger:innen
erhalten dadurch die Möglichkeit, nachhaltige Geldanlagen zu tätigen, indem ihnen transparent dargelegt wird, wie sich
investiertes Kapital auf die Umwelt und Gesellschaft auswirkt.
Um einen einheitlichen Standard zu schaffen, was als „nachhaltige Geldanlage“ gilt, hat der Europäische Gesetzgeber die „Offenlegungs-
Verordnung“1 und die „Taxonomie- Verordnung“2 erlassen. Die Offenlegungs-Verordnung definiert nachhaltige Investitionen im
Allgemeinen, während die Taxonomie-Verordnung die Offenlegungs-Verordnung bezüglich „ökologisch nachhaltige Investitionen“
konkretisiert.
In diesem Informationsblatt erhalten Sie Informationen zu den unterschiedlichen, rechtlichen Bedeutungen der Nachhaltigkeit, inwiefern
Sie Nachhaltigkeitskriterien bei Ihrer Investition berücksichtigen können, und woran Sie erkennen können, in welchen Ausmaß Ihre
Investition nachhaltig ist.
1. Was gilt als „nachhaltige“ Investition?
Die Offenlegungs-Verordnung orientiert sich an den zuvor genannten ESG-Kriterien und legt fest, dass eine Investition dann
als nachhaltig gilt, wenn:
E die Investition zur Erreichung eines Umweltziels beiträgt
(siehe hierzu Punkt 2. zu „ökologisch nachhaltigen“ Investitionen) oder
S die Investition zur Erreichung eines sozialen Ziels beiträgt, insbesondere eine Investition, die zur Bekämpfung von
Ungleichheiten beiträgt oder den sozialen Zusammenhalt, die soziale Integration und die Arbeitsbeziehungen
fördert oder eine Investition in Humankapital oder zugunsten wirtschaftlich oder sozial benachteiligter
Bevölkerungsgruppen und die Investition kein Umweltziel oder soziales Ziel erheblich beeinträchtigt und
G die Unternehmen, in die investiert wird, Verfahrensweisen einer guten Unternehmensführung anwenden,
insbesondere bei soliden Managementstrukturen, den Beziehungen zu den Arbeitnehmern, der Vergütung
von Mitarbeiter:innen sowie der Einhaltung der Steuervorschriften.
2. Was gilt als „ökologisch nachhaltige“ Investition?
Nach der Taxonomie-Verordnung gilt eine Investition in eine wirtschaftliche Tätigkeit dann als „ökologisch nachhaltig“, wenn
die wirtschaftliche Tätigkeit zumindest einem Umweltziel dient und einen wesentlichen Beitrag zur Erreichung dieses
Ziels leistet,
die wirtschaftliche Tätigkeit nicht gleichzeitig zu einer erheblichen Beeinträchtigung eines oder mehrerer
Umweltziele führt,
die wirtschaftliche Tätigkeit unter Einhaltung des festgelegten Mindestschutzes ausgeübt wird (betrifft Menschenund
Arbeitnehmerrechte, Leitsätze in der Unternehmensführung etc.), sowie
dabei die entsprechenden technischen Vorgaben, die an Kennzahlen gemessen werden, eingehalten werden (z.B.
Schwellenwerte für Emissionen oder CO2- Fußabdruck).
Sind diese Punkte erfüllt, handelt es sich um eine „ökologisch nachhaltige“ Investition. Die Taxonomie-Verordnung nennt
dabei sechs Umweltziele Sechs Umweltziele
1. Klimaschutz:
Darunter versteht man Beiträge zur Stabilisierung von Treibhausgasemissionen, also eine Vorgehensweise, die den Anstieg
der durchschnittlichen Erdtemperatur auf deutlich unter 2 °C zu halten versucht. Da es einige Wirtschaftstätigkeiten gibt,
die sich negativ auf die Umwelt auswirken, kann ein wesentlicher Beitrag zu einem Umweltziel auch darin bestehen, solche
negativen Auswirkungen zu verringern. Beispiele hierfür sind der Ausbau klimaneutraler Mobilität oder die Erzeugung
sauberer Kraftstoffe aus erneuerbaren Quellen.
2. Anpassung an den Klimawandel:
Darunter versteht man Tätigkeiten, welche nachteilige Auswirkungen des derzeitigen oder künftigen Klimas oder die Gefahr
nachteiliger Auswirkungen auf die Tätigkeit selbst, Menschen, die Natur oder Vermögenswerte verringern oder vermeiden
soll.
3. Die nachhaltige Nutzung und der Schutz von Wasser- und Meeresressourcen:
Hierzu zählt z.B. der Schutz vor den nachteiligen Auswirkungen der Einleitung von städtischem und industriellem Abwasser.
4. Der Übergang zu einer Kreislaufwirtschaft:
Recycling“, aber auch die Verbesserung der Haltbarkeit und Reparaturfähigkeit von Produkten.
5. Vermeidung und Verminderung der Umweltverschmutzung:
z.B. Verbesserung der Luft-, Wasser- oder Bodenqualität in den Gebieten, in denen die Wirtschaftstätigkeit stattfindet, aber
auch die Beseitigung von Abfall.
6. Der Schutz und die Wiederherstellung der Artenvielfalt (Biodiversität) und der Ökosysteme:
Gemeint sind hier unter anderem nachhaltige Landnutzung und - bewirtschaftung oder die nachhaltige
Waldbewirtschaftung.
3. Berücksichtigung von ökologischen, sozialen und ethischen Nachhaltigkeitskriterienbei Ihrer Investition
Im Zuge einer Anlageberatung sind wir als Anlageberater:in verpflichtet, zu erheben, ob und inwiefern wir bei der
Veranlagung Ihres Kapitals die Nachhaltigkeit von Finanzinstrumenten berücksichtigen sollen.
Bei dieser Erhebung können Sie zunächst folgende Angaben zu Ihrer Nachhaltigkeitspräferenz machen:
a) Sie präferieren ökologisch nachhaltige Finanzinstrumente im Sinne der Taxonomie-Verordnung (siehe Punkt 2.).
b) Sie präferieren (insbesondere sozial und unternehmerisch) nachhaltige Finanzinstrumente im Sinne
der Offenlegungsverordnung (siehe Punkt 1.).
c) Sie präferieren Finanzinstrumente, die weder als ökologisch nachhaltig“ im Sinne der Taxonomie-Verordnung noch
als „nachhaltig“ im Sinne der Offenlegungs-Verordnung eingestuft werden, bei denen aber die für Sie
wichtigsten nachteiligen Auswirkungen auf Nachhaltigkeitsfaktoren berücksichtigt werden. Als
Nachhaltigkeitsfaktoren gelten Umwelt-, Sozial- und Arbeitnehmerbelange, die Achtung der Menschenrechte und
die Bekämpfung von Korruption und Bestechung.
d) Sie präferieren eine Kombination aus den orgenannten Finanzinstrumenten.
e) Sie haben keine Präferenz für nachhaltige Finanzinstrumente.
Anschließend können Sie bei Vorliegen einer Präferenz auch angeben, welchen Mindestanteil diese Investition ausmachen
soll, sowie welche Parameter (z.B. quantitative Werte) herangezogen werden sollen, um die nachteiligen Auswirkungen
auf Nachhaltigkeitsfaktoren zu ermitteln. Derartige Parameter können etwa Indikatoren aus dem Umweltbereich (z.B.
Energieintensität eines Unternehmens/einer Branche, CO2-Fußabdruck usw.) oder Indikatoren aus dem gesellschaftlichen
Bereich (z.B. Gender-Diversity im Vorstand, Umgang mit kontroversen Waffen usw.) sein.
Wenn Sie Nachhaltigkeitspräferenzen nennen, wird Ihnen ein Finanzprodukt empfohlen, welches Ihren
Nachhaltigkeitspräferenzen (Offenlegungs-Verordnung, Taxonomie- Verordnung und/oder nachteilige Auswirkungen auf
Nachhaltigkeitsfaktoren) entspricht. 4. Wie erkenne ich, ob eine Investition diesen Nachhaltigkeitskriterien entspricht?
Wir dürfen Ihnen als Anlageberater:in nur Investitionen empfehlen, die Ihren Präferenzen entsprechen. Dies gilt für alle
Finanzinstrumente und auch konkret i.Z.m. Ihren Nachhaltigkeitspräferenzen.
Zusätzlich dazu normieren die Offenlegungs- und die Taxonomie-Verordnung für Finanzmarktteilnehmer, bspw. Hersteller
und Anbieter von Finanzprodukten, und Finanzberater umfassende Offenlegungspflichten zu Nachhaltigkeitsrisiken.
Diese umfassen insbesondere die Art und Weise, wie Nachhaltigkeitsrisiken bei ihren Investitionsentscheidungen bzw.
bei ihrer Beratung einbezogen werden und die Ergebnisse der Bewertung der zu erwartenden Auswirkungen von
Nachhaltigkeitsrisiken auf die Rendite von Finanzprodukten, die sie zur Verfügung stellen bzw. die von ihnen beraten werden.
Darüber hinaus sind Finanzmarktteilnehmer und Finanzberater bei gewissen Finanzprodukten, die gemäß den Verordnungen
als „nachhaltig“ und „ökologisch nachhaltig“ bezeichnet werden dürfen, verpflichtet, weitere Informationen zu diesen
Finanzprodukten auf deren Internetseiten offenzulegen. Diese zusätzlichen Informationspflichten betreffen aber nur
folgende Finanzprodukte: Verwaltete Wertpapierportfolios, Investmentfonds (OGAW), alternative Investmentfonds (AIF),
Versicherungsanlageprodukte (IBIPs), Paneuropäische Private Pensionsprodukte (PEPPs) sowie Altersvorsorgeprodukte
und - systeme.
Für diese Finanzprodukte gibt es drei Kategorien, die Ihnen zeigen, ob bzw. wie stark die Nachhaltigkeit im Finanzprodukt
berücksichtigt ist:
a) „dunkelgrüne“ Finanzprodukte (Art 9) Finanzprodukte, die eine nachhaltige Investition anstreben
(„dunkelgrüne“ Finanzprodukte - Art 9) - bei diesen
Finanzprodukten ist die Nachhaltigkeit am stärksten
sichergestellt und die Informationspflichten am umfangreichsten.
b) „hellgrüne“ Finanzprodukte (Art 8) Finanzprodukte, die ökologische oder soziale (oder eine Kombination
beider) Merkmale bewerben („hellgrüne“ Finanzprodukte - Art 8). Bei
diesen Finanzprodukten werden ökologische oder soziale Merkmale
lediglich berücksichtigt, während dunkelgrüne Finanzprodukte ein
Umweltziel explizit anstreben.
Sonstige Finanzprodukte Sonstige Finanzprodukte, die Nachhaltigkeitskriterien gemäß
Offenlegungs- bzw. Taxonomie-Verordnung nicht oder in geringem
Umfang berücksichtigen.
ACHTUNG: Diese zusätzlichen Informationspflichten gelten nur für gewisse Finanzinstrumente. Andere Finanzinstrumente,
wie z.B. Unternehmensanleihen, lösen diese zusätzlichen Informationspflichten nicht aus. Unabhängig davon werden Ihre
Nachhaltigkeitspräferenzen aber bei allen Finanzinstrumenten, die wir Ihnen empfehlen, berücksichtigt.
Fazit
Der Begriff der Nachhaltigkeit deckt im europäischen Rechtsrahmen verschiedene Aspekte ab - insbesondere ökologische,
soziale und unternehmerische Nachhaltigkeit. In welchem Ausmaß und in welcher Ausprägung die Nachhaltigkeit bei den
Finanzprodukten im Rahmen der Anlageberatung berücksichtigt wird, hängt von Ihren Präferenzen ab, die Sie Ihrem/Ihrer
Anlageberater:in bei Ihrem Beratungsgespräch offenlegen.
Wenn Sie uns Nachhaltigkeitspräferenzen nennen, empfehlen wir Ihnen im Rahmen der Anlageberatung nur
Finanzinstrumente, die Ihren konkreten Nachhaltigkeitspräferenzen entsprechen.
Wenn Sie uns keine Nachhaltigkeitspräferenzen nennen, stufen wir Sie als „nachhaltigkeitsneutral“ ein. Das heißt, dass
wir in die Eignungsbeurteilung bzw. in die Auswahl jener Finanzinstrumente, die wir Ihnen gegebenenfalls empfehlen
oder im Rahmen der Portfolioverwaltung einsetzen, Ihre sonstigen Anlagepräferenzen (z.B. Risikotoleranz, Erfahrungen
und Kenntnisse, Vermögens- verhältnisse) einbeziehen. Die Nachhaltigkeit ist dann allerdings kein Auswahl- bzw.
Ausschlusskriterium.
Als Anlageberater:in beziehen wir die Informationen über die Nachhaltigkeit in Finanzinstrumenten, aus den offengelegten
Informationen der jeweiligen Produkthersteller, z.B. aus den regelmäßigen Berichten zu den Finanzinstrumenten. Diese
sind auch für Sie, z.B. auf den jeweiligen Internetseiten der Produktanbieter, einsehbar. Dort finden Sie unter anderem eine
Beschreibung der ökologischen oder sozialen Merkmale oder des nachhaltigen Investitionsziels, Angaben zu den Methoden,
die angewandt werden, um die ökologischen oder sozialen Merkmale der für das Finanzprodukt ausgewählten nachhaltigen
Investitionen zu bewerten, zu messen und zu überwachen sowie Informationen über die wichtigsten nachteiligen
Auswirkungen auf die Nachhaltigkeitsfaktoren von Finanzinstrumenten. Bedenken Sie, dass es sich dabei um Informationen
handeln kann, die sich auf Zeiträume beziehen, die in der Vergangenheit liegen.
=======
                      Umgang der 4money mit Nachhaltigkeitsrisiken
                     {' ○ Sehr langfristig (> 10 Jahre)'}
                      %
                      %
                      Die 4money berücksichtigt Nachhaltigkeitsrisiken im Rahmen der Anlageberatung in der Regel nur auf ausdrücklichen
                      Kund:innenwunsch. Ohne einen solchen Kund:innenwunsch berücksichtigt die 4money daher bei der Erbringung der
                      Wertpapierdienstleistungen keine Nachhaltigkeitsrisiken. Dies erfolgt aus Verhältnismäßigkeitserwägungen sowie aus der
                      Überlegung, dass mit den Anlageempfehlungen in erster Linie die vermögensrechtlichen Interessen der Kund:innen zu wahren
                      sind.
                      Informationen zur Nachhaltigkeit im Zusammenhang mit der Abfrage von Nachhaltigkeitspräferenzen
                      Präambel
                      Der europäische Aktionsplan für ein nachhaltiges Finanzsystem sieht vor, dass die europäische Finanzindustrie bei der
                      Konzeption und dem Vertrieb von Finanzprodukten ökologische (Environment), soziale (Social) und verantwortungsvolle
                      Unternehmensführungs- (Governance) Kriterien zu berücksichtigen hat (sogenannte ESG-Kriterien). Anleger:innen erhalten
                      dadurch die Möglichkeit, nachhaltige Geldanlagen zu tätigen, indem ihnen transparent dargelegt wird, wie sich investiertes
                      Kapital auf die Umwelt und Gesellschaft auswirkt.
                      4money Financial Services GmbH | Einspinnergasse 1, A-8010 Graz |  +43 (676) 92 00 670 |  office@4money.at |  www.4money.at
                      Konzessioniertes
                      Wertpapierdienstleistungsunternehmen gem. §4 Abs. 1 WAG 2018 | Firmenbuchgericht: LG f. ZRS Graz | FN 618973 f
                      03
                      Umwelt
                      (environment)
                      ESG
                      Soziales
                      (social)
                      Unternehmens
                      führung
                      (governance)
                      Übersicht: ESG Kriterien
                      Um einen einheitlichen Standard zu schaffen, was als „nachhaltige Geldanlage“ gilt, hat der Europäische Gesetzgeber die „Offenlegungs
                      Verordnung“1 und die „Taxonomie- Verordnung“2 erlassen. Die Offenlegungs-Verordnung definiert nachhaltige Investitionen im
                      Allgemeinen, während die Taxonomie-Verordnung die Offenlegungs-Verordnung bezüglich „ökologisch nachhaltige Investitionen“
                      konkretisiert.
                      In diesem Informationsblatt erhalten Sie Informationen zu den unterschiedlichen, rechtlichen Bedeutungen der Nachhaltigkeit, inwiefern
                      Sie Nachhaltigkeitskriterien bei Ihrer Investition berücksichtigen können, und woran Sie erkennen können, in welchen Ausmaß Ihre
                      Investition nachhaltig ist.
                      1. Was gilt als „nachhaltige“ Investition?
                      Die Offenlegungs-Verordnung orientiert sich an den zuvor genannten ESG-Kriterien und legt fest, dass eine Investition dann
                      als nachhaltig gilt, wenn:
                      E
                      S
                      G
                      die Investition zur Erreichung eines Umweltziels beiträgt
                      (siehe hierzu Punkt 2. zu „ökologisch nachhaltigen“ Investitionen) oder
                      die Investition zur Erreichung eines sozialen Ziels beiträgt, insbesondere eine Investition, die zur Bekämpfung von
                      Ungleichheiten beiträgt oder den sozialen Zusammenhalt, die soziale Integration und die Arbeitsbeziehungen
                      fördert oder eine Investition in Humankapital oder zugunsten wirtschaftlich oder sozial benachteiligter
                      Bevölkerungsgruppen und die Investition kein Umweltziel oder soziales Ziel erheblich beeinträchtigt und
                      die Unternehmen, in die investiert wird, Verfahrensweisen einer guten Unternehmensführung anwenden,
                      insbesondere bei soliden Managementstrukturen, den Beziehungen zu den Arbeitnehmern, der Vergütung
                      von Mitarbeiter:innen sowie der Einhaltung der Steuervorschriften.
                      2. Was gilt als „ökologisch nachhaltige“ Investition?
                      Nach der Taxonomie-Verordnung gilt eine Investition in eine wirtschaftliche Tätigkeit dann als „ökologisch nachhaltig“, wenn
                      die wirtschaftliche Tätigkeit zumindest einem Umweltziel dient und einen wesentlichen Beitrag zur Erreichung dieses
                      Ziels leistet,
                      die wirtschaftliche Tätigkeit nicht gleichzeitig zu einer erheblichen Beeinträchtigung eines oder mehrerer
                      Umweltziele führt,
                      die wirtschaftliche Tätigkeit unter Einhaltung des festgelegten Mindestschutzes ausgeübt wird (betrifft Menschen-
                      und Arbeitnehmerrechte, Leitsätze in der Unternehmensführung etc.), sowie
                      dabei die entsprechenden technischen Vorgaben, die an Kennzahlen gemessen werden, eingehalten werden (z.B.
                      Schwellenwerte für Emissionen oder CO2- Fußabdruck).
                      Sind diese Punkte erfüllt, handelt es sich um eine „ökologisch nachhaltige“ Investition. Die Taxonomie-Verordnung nennt
                      dabei sechs Umweltziele.
                      1 Verordnung (EU) 2019/2088 vom 27. November 2019 über nachhaltigkeitsbezogene Offenlegungspflichten im Finanzdienstleistungssektor.
                      2 Verordnung (EU) 2020/852 vom 18. Juni 2020 über die Einrichtung eines Rahmens zur Erleichterung nachhaltiger Investitionen und zur Änderung der Verordnung (EU) 2019/2088.
                      4money Financial Services GmbH | Einspinnergasse 1, A-8010 Graz |  +43 (676) 92 00 670 |  office@4money.at |  www.4money.at
                      Konzessioniertes
                      Wertpapierdienstleistungsunternehmen gem. §4 Abs. 1 WAG 2018 | Firmenbuchgericht: LG f. ZRS Graz | FN 618973 f
                      04
                      Sechs Umweltziele
                      1. Klimaschutz:
                      Darunter versteht man Beiträge zur Stabilisierung von Treibhausgasemissionen, also eine Vorgehensweise, die den Anstieg
                      der durchschnittlichen Erdtemperatur auf deutlich unter 2 °C zu halten versucht. Da es einige Wirtschaftstätigkeiten gibt,
                      die sich negativ auf die Umwelt auswirken, kann ein wesentlicher Beitrag zu einem Umweltziel auch darin bestehen, solche
                      negativen Auswirkungen zu verringern. Beispiele hierfür sind der Ausbau klimaneutraler Mobilität oder die Erzeugung
                      sauberer Kraftstoffe aus erneuerbaren Quellen.
                      2. Anpassung an den Klimawandel:
                      Darunter versteht man Tätigkeiten, welche nachteilige Auswirkungen des derzeitigen oder künftigen Klimas oder die Gefahr
                      nachteiliger Auswirkungen auf die Tätigkeit selbst, Menschen, die Natur oder Vermögenswerte verringern oder vermeiden
                      soll.
                      3. Die nachhaltige Nutzung und der Schutz von Wasser- und Meeresressourcen:
                      Hierzu zählt z.B. der Schutz vor den nachteiligen Auswirkungen der Einleitung von städtischem und industriellem Abwasser.
                      4. Der Übergang zu einer Kreislaufwirtschaft:
                      Recycling“, aber auch die Verbesserung der Haltbarkeit und Reparaturfähigkeit von Produkten.
                      5. Vermeidung und Verminderung der Umweltverschmutzung:
                      z.B. Verbesserung der Luft-, Wasser- oder Bodenqualität in den Gebieten, in denen die Wirtschaftstätigkeit stattfindet, aber
                      auch die Beseitigung von Abfall.
                      6. Der Schutz und die Wiederherstellung der Artenvielfalt (Biodiversität) und der Ökosysteme:
                      Gemeint sind hier unter anderem nachhaltige Landnutzung und - bewirtschaftung oder die nachhaltige
                      Waldbewirtschaftung.
                      3. Berücksichtigung von ökologischen, sozialen und ethischen Nachhaltigkeitskriterienbei Ihrer Investition
                      Im Zuge einer Anlageberatung sind wir als Anlageberater:in verpflichtet, zu erheben, ob und inwiefern wir bei der
                      Veranlagung Ihres Kapitals die Nachhaltigkeit von Finanzinstrumenten berücksichtigen sollen.
                      Bei dieser Erhebung können Sie zunächst folgende Angaben zu Ihrer Nachhaltigkeitspräferenz machen:
                      a) Sie präferieren ökologisch nachhaltige Finanzinstrumente im Sinne der Taxonomie-Verordnung (siehe Punkt 2.).
                      b) Sie präferieren (insbesondere sozial und unternehmerisch) nachhaltige Finanzinstrumente im Sinne
                      der Offenlegungsverordnung (siehe Punkt 1.).
                      c) Sie präferieren Finanzinstrumente, die weder als ökologisch nachhaltig“ im Sinne der Taxonomie-Verordnung noch
                      als „nachhaltig“ im Sinne der Offenlegungs-Verordnung eingestuft werden, bei denen aber die für Sie
                      wichtigsten nachteiligen Auswirkungen auf Nachhaltigkeitsfaktoren berücksichtigt werden. Als
                      Nachhaltigkeitsfaktoren gelten Umwelt-, Sozial- und Arbeitnehmerbelange, die Achtung der Menschenrechte und
                      die Bekämpfung von Korruption und Bestechung.
                      d) Sie präferieren eine Kombination aus den orgenannten Finanzinstrumenten.
                      e) Sie haben keine Präferenz für nachhaltige Finanzinstrumente.
                      Anschließend können Sie bei Vorliegen einer Präferenz auch angeben, welchen Mindestanteil diese Investition ausmachen
                      soll, sowie welche Parameter (z.B. quantitative Werte) herangezogen werden sollen, um die nachteiligen Auswirkungen
                      auf Nachhaltigkeitsfaktoren zu ermitteln. Derartige Parameter können etwa Indikatoren aus dem Umweltbereich (z.B.
                      Energieintensität eines Unternehmens/einer Branche, CO2-Fußabdruck usw.) oder Indikatoren aus dem gesellschaftlichen
                      Bereich (z.B. Gender-Diversity im Vorstand, Umgang mit kontroversen Waffen usw.) sein.
                      Wenn Sie Nachhaltigkeitspräferenzen nennen, wird Ihnen ein Finanzprodukt empfohlen, welches Ihren
                      Nachhaltigkeitspräferenzen (Offenlegungs-Verordnung, Taxonomie- Verordnung und/oder nachteilige Auswirkungen auf
                      Nachhaltigkeitsfaktoren) entspricht.
                      4money Financial Services GmbH | Einspinnergasse 1, A-8010 Graz |  +43 (676) 92 00 670 |  office@4money.at |  www.4money.at
                      Konzessioniertes
                      Wertpapierdienstleistungsunternehmen gem. §4 Abs. 1 WAG 2018 | Firmenbuchgericht: LG f. ZRS Graz | FN 618973 f
                      05
                      4. Wie erkenne ich, ob eine Investition diesen Nachhaltigkeitskriterien entspricht?
                      Wir dürfen Ihnen als Anlageberater:in nur Investitionen empfehlen, die Ihren Präferenzen entsprechen. Dies gilt für alle
                      Finanzinstrumente und auch konkret i.Z.m. Ihren Nachhaltigkeitspräferenzen.
                      Zusätzlich dazu normieren die Offenlegungs- und die Taxonomie-Verordnung für Finanzmarktteilnehmer, bspw. Hersteller
                      und Anbieter von Finanzprodukten, und Finanzberater umfassende Offenlegungspflichten zu Nachhaltigkeitsrisiken.
                      Diese umfassen insbesondere die Art und Weise, wie Nachhaltigkeitsrisiken bei ihren Investitionsentscheidungen bzw.
                      bei ihrer Beratung einbezogen werden und die Ergebnisse der Bewertung der zu erwartenden Auswirkungen von
                      Nachhaltigkeitsrisiken auf die Rendite von Finanzprodukten, die sie zur Verfügung stellen bzw. die von ihnen beraten werden.
                      Darüber hinaus sind Finanzmarktteilnehmer und Finanzberater bei gewissen Finanzprodukten, die gemäß den Verordnungen
                      als „nachhaltig“ und „ökologisch nachhaltig“ bezeichnet werden dürfen, verpflichtet, weitere Informationen zu diesen
                      Finanzprodukten auf deren Internetseiten offenzulegen. Diese zusätzlichen Informationspflichten betreffen aber nur
                      folgende Finanzprodukte: Verwaltete Wertpapierportfolios, Investmentfonds (OGAW), alternative Investmentfonds (AIF),
                      Versicherungsanlageprodukte (IBIPs), Paneuropäische Private Pensionsprodukte (PEPPs) sowie Altersvorsorgeprodukte
                      und - systeme.
                      Für diese Finanzprodukte gibt es drei Kategorien, die Ihnen zeigen, ob bzw. wie stark die Nachhaltigkeit im Finanzprodukt
                      berücksichtigt ist:
                      a) „dunkelgrüne“ Finanzprodukte (Art 9)
                      b) „hellgrüne“ Finanzprodukte (Art 8)
                      Sonstige Finanzprodukte
                      Finanzprodukte, die eine nachhaltige Investition anstreben
                      („dunkelgrüne“ Finanzprodukte - Art 9) - bei diesen
                      Finanzprodukten ist die Nachhaltigkeit am stärksten
                      sichergestellt und die Informationspflichten am umfangreichsten.
                      Finanzprodukte, die ökologische oder soziale (oder eine Kombination
                      beider) Merkmale bewerben („hellgrüne“ Finanzprodukte - Art 8). Bei
                      diesen Finanzprodukten werden ökologische oder soziale Merkmale
                      lediglich berücksichtigt, während dunkelgrüne Finanzprodukte ein
                      Umweltziel explizit anstreben.
                      Sonstige Finanzprodukte,  die Nachhaltigkeitskriterien gemäß
                      Offenlegungs- bzw. Taxonomie-Verordnung nicht oder in geringem
                      Umfang berücksichtigen.
                      ACHTUNG: Diese zusätzlichen Informationspflichten gelten nur für gewisse Finanzinstrumente. Andere Finanzinstrumente,
                      wie z.B. Unternehmensanleihen, lösen diese zusätzlichen Informationspflichten nicht aus. Unabhängig davon werden Ihre
                      Nachhaltigkeitspräferenzen aber bei allen Finanzinstrumenten, die wir Ihnen empfehlen, berücksichtigt.
                      Fazit
                      Der Begriff der Nachhaltigkeit deckt im europäischen Rechtsrahmen verschiedene Aspekte ab - insbesondere ökologische,
                      soziale und unternehmerische Nachhaltigkeit. In welchem Ausmaß und in welcher Ausprägung die Nachhaltigkeit bei den
                      Finanzprodukten im Rahmen der Anlageberatung berücksichtigt wird, hängt von Ihren Präferenzen ab, die Sie Ihrem/Ihrer
                      Anlageberater:in bei Ihrem Beratungsgespräch offenlegen.
                      Wenn Sie uns Nachhaltigkeitspräferenzen nennen, empfehlen wir Ihnen im Rahmen der Anlageberatung nur
                      Finanzinstrumente, die Ihren konkreten Nachhaltigkeitspräferenzen entsprechen.
                      Wenn Sie uns keine Nachhaltigkeitspräferenzen nennen, stufen wir Sie als „nachhaltigkeitsneutral“ ein. Das heißt, dass
                      wir in die Eignungsbeurteilung bzw. in die Auswahl jener Finanzinstrumente, die wir Ihnen gegebenenfalls empfehlen
                      oder im Rahmen der Portfolioverwaltung einsetzen, Ihre sonstigen Anlagepräferenzen (z.B. Risikotoleranz, Erfahrungen
                      und Kenntnisse, Vermögens- verhältnisse) einbeziehen. Die Nachhaltigkeit ist dann allerdings kein Auswahl- bzw.
                      Ausschlusskriterium.
                      Als Anlageberater:in beziehen wir die Informationen über die Nachhaltigkeit in Finanzinstrumenten, aus den offengelegten
                      Informationen der jeweiligen Produkthersteller, z.B. aus den regelmäßigen Berichten zu den Finanzinstrumenten. Diese
                      sind auch für Sie, z.B. auf den jeweiligen Internetseiten der Produktanbieter, einsehbar. Dort finden Sie unter anderem eine
                      Beschreibung der ökologischen oder sozialen Merkmale oder des nachhaltigen Investitionsziels, Angaben zu den Methoden,
                      die angewandt werden, um die ökologischen oder sozialen Merkmale der für das Finanzprodukt ausgewählten nachhaltigen
                      Investitionen zu bewerten, zu messen und zu überwachen sowie Informationen über die wichtigsten nachteiligen
                      Auswirkungen auf die Nachhaltigkeitsfaktoren von Finanzinstrumenten. Bedenken Sie, dass es sich dabei um Informationen
                      handeln kann, die sich auf Zeiträume beziehen, die in der Vergangenheit liegen.
>>>>>>> d708c3e94dc081fe18ea1072733f4c2174e67e51
                      {/*termsAndConditions?.[
                          step === PHASES.TERMS1
                            ? 0
                            : (termsAndConditions.length > 1 ? 1 : 0)]?.content
                          || 'No terms and conditions available.'*/}
                    </p>
                  </div>
                </div>

                {/* Status Message */}
                {confirmed && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-center animate-pulse">
                    Thank you for confirming!
                  </div>
                )}
              </div>
            )}

            {step === PHASES.QUESTIONS1 && (
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
            )}

            {step === PHASES.QUESTIONS2 && (
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
            )}

            {step === PHASES.SUGGESTIONS && (
              <div className="w-full h-full">
                <h2 className="text-xl font-bold mb-4">Vorgeschlagene Produkte</h2>
                <p className="text-gray-600 mb-6">
                  Basierend auf Ihren Antworten empfehlen wir:
                </p>
                <div
                  className="border p-4 rounded shadow"
                  style={{ height: "85%" }}
                >
                  <h3 className="font-semibold">
                    {suggestedProduct?.fullName ||
                      suggestedProduct?.name ||
                      "Product"}
                  </h3>
                  {suggestedProduct?.description && (
                    <p className="text-sm text-gray-600 mb-2">
                      {suggestedProduct.description}
                    </p>
                  )}
                  {suggestedProduct?.fileName ? (
                    <iframe
                      src={
                        suggestedProduct.fileName.startsWith("http")
                          ? suggestedProduct.fileName
                          : `${process.env.NEXT_PUBLIC_FRONTEND_URL}${suggestedProduct.fileName}`
                      }
                      className="w-full rounded"
                      style={{ height: "85%" }}
                    />
                  ) : (
                    <div
                      className="w-full rounded bg-gray-100 flex items-center justify-center"
                      style={{ height: "90%" }}
                    >
                      <p className="text-gray-500">
                        No product document available
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === PHASES.CHAT && (
              <Chatbot
                sessionId={session_id || ""}
                threadId={threadId || ""}
                messages={messages}
                input={input}
                setInput={setInput}
                handleSubmit={handleChatbotSubmit}
                loading={chatBtnLading}
              />
            )}

            {step === PHASES.PERSONAL_INFO && (
              <div className="container mx-auto p-4">
                {/* <h1 className="text-xl font-bold text-center mb-6">Personal Information Form</h1> */}
                <PersonalInfoForm formik={formik} />
              </div>
            )}

            {step === PHASES.SIGN_DOCUMENT && (
              <div className="w-full p-8">
                {/* <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Identity Verification Process</h2>
                  </div> */}

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
                  className="rounded-md border border-gray-200"
                  onEvent={(e) => {
                    console.log("Event : ", JSON.stringify(e));
                  }}
                />
                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                  </div>
                )}
              </div>
            )}

            {step === PHASES.RESULT_PDF && (
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
          <div className="flex justify-between mt-3">
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
              className={buttonBackClass}
            >
              Back
            </button>
            <div className="flex justify-end">
              {step === PHASES.TERMS1 || step === PHASES.TERMS2 ? (
                <button
                  onClick={handleConfirm}
                  disabled={confirmed}
                  className={`${buttonBaseClass} ${confirmed ? buttonConfirmedClass : buttonConfirmClass
                    } disabled:cursor-not-allowed`}
                >
                  {confirmed ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Confirmed!
                    </>
                  ) : (
                    "I Confirm"
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
                  className={`${buttonBaseClass} ${buttonNextClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                  type={step === PHASES.PERSONAL_INFO ? "submit" : "button"}
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={step < PHASES.RESULT_PDF ? nextStep : backDashboard}
                  className={`${buttonBaseClass} ${buttonNextClass}`}
                >
                  {step === PHASES.RESULT_PDF ? "Finish" : "Next"}
                </button>
              )}
            </div>
          </div>
        </React.Fragment>
      )}
    </div>
  );
}
