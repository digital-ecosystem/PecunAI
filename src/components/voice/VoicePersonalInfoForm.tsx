"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormik } from "formik";
import * as Yup from "yup";
import PersonalInfoForm from "@/app/customer/stepper/PersonalInfoForm";
import PrivacyPauseBanner from "./PrivacyPauseBanner";
import type { PersonalInfoFormData } from "@/types";

// Validation schema — copied verbatim from V1 (stepper/[session_id]/page.tsx).
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
    .oneOf(["Single", "Married", "Divorced", "Widowed"], "Ungültiger Familienstand")
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
    .matches(/^\+?\d{7,15}$/, "Telefonnummer muss 7 bis 15 Ziffern haben, optional beginnend mit '+'")
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
  country: Yup.string().required("Land ist erforderlich"),
  bankName: Yup.string().required("Name der Bank ist erforderlich"),
  isTaxResidentAT: Yup.boolean()
    .required("Bitte geben Sie an, ob Sie in Österreich steueransässig sind"),
  isTaxResidentOther: Yup.boolean()
    .required("Bitte geben Sie an, ob Sie in einem anderen Land steueransässig sind"),
  isPEP: Yup.boolean()
    .required("Bitte geben Sie an, ob Sie eine PEP sind")
    .nullable(),
  taxResidencyCountry: Yup.string().when("isTaxResidentOther", {
    is: true,
    then:      (schema) => schema.required("Steueransässigkeitsland ist erforderlich"),
    otherwise: (schema) => schema.nullable(),
  }),
  gender: Yup.string().required("Geschlecht ist erforderlich"),
  isSelfEmployed: Yup.boolean().nullable(),
});

interface VoicePersonalInfoFormProps {
  sessionId:    string;
  onSubmitted:  () => void;
  /** Must be invoked synchronously from the submit button's onClick, before any async
   *  work — see useVoiceSession.ts's primeReconnectAudio for why. */
  onPrimeAudio: () => void;
}

export default function VoicePersonalInfoForm({ sessionId, onSubmitted, onPrimeAudio }: VoicePersonalInfoFormProps) {
  const router = useRouter();
  const [highRiskCountries, setHighRiskCountries] = useState<string[]>([]);
  const [isPepStop, setIsPepStop] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const formik = useFormik<PersonalInfoFormData>({
    initialValues: {
      firstName:           "",
      lastName:            "",
      birthPlace:          "",
      birthCountry:        "",
      nationality:         "",
      birthDate:           "",
      maritalStatus:       "",
      street:              "",
      houseNumber:         "",
      postalCode:          "",
      city:                "",
      countryCode:         "+43",
      phone:               "",
      email:               (typeof window !== "undefined" && window.localStorage.getItem("userEmail")) || "",
      iban:                "",
      education:           "",
      currentJob:          "",
      industry:            "",
      occupation:          "",
      documentType:        "",
      documentNumber:      "",
      issuingAuthority:    "",
      issuedOn:            "",
      validUntil:          "",
      isPEP:               null,
      residenceAbroad:     false,
      actingFor:           "",
      magicFlow:           process.env.NEXT_PUBLIC_ENV === "development",
      country:             "",
      bic:                 "",
      bankName:            "",
      isTaxResidentAT:     null,
      isTaxResidentOther:  null,
      gender:              "",
      isSelfEmployed:      false,
      taxResidencyCountry: "",
    },
    validationSchema,
    onSubmit: (values) => onPersonalInfoSubmit(values),
  });

  // Same high-risk-country source as V1 — used only for the compliance gate below.
  useEffect(() => {
    const fetchHighRiskCountries = async () => {
      try {
        const response = await fetch("/api/high-risk-countries");
        if (response.ok) {
          const data = await response.json();
          setHighRiskCountries(data.map((c: Record<string, string>) => c.name));
        }
      } catch (error) {
        console.error("Failed to fetch high-risk countries:", error);
      }
    };
    fetchHighRiskCountries();
  }, []);

  // Pre-load any already-saved PersonalInfo — fetched fresh from the DB every time, same as
  // V1. Deliberately NOT cached in Zustand/localStorage — this is the whole point of the
  // silent phase. See private-documents/remaining-phases/PHASE_3_PERSONAL_INFO_PLAN.md Step 4.
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch(`/api/user/info/${sessionId}`, { method: "GET" });
        const data = await response.json();
        if (data?.success && data.user) {
          const user = data.user;
          formik.setValues({
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
          });
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
      }
    };
    fetchUserInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Submit + compliance gate — copied verbatim from V1's onPersonalInfoSubmit
  // (stepper/[session_id]/page.tsx). This is a legal gate, not a UX choice.
  const onPersonalInfoSubmit = async (data: PersonalInfoFormData) => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/user/update?id=${sessionId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateOfBirth: data.birthDate
            ? new Date(data.birthDate).toISOString()
            : undefined,
          actsOnOwnAccount:        data.actingFor === "own",
          city:                    data.city,
          currentProfession:       data.currentJob,
          customerClassification: "",
          education:               data.education,
          email:                   data.email,
          firstName:               data.firstName,
          houseNumber:             data.houseNumber,
          industry:                data.industry,
          isPep:                   data.isPEP,
          lastName:                data.lastName,
          maritalStatus:           data.maritalStatus,
          nationality:             data.nationality,
          countryCode:             data.countryCode,
          phone:                   data.phone,
          placeOfBirth:            data.birthPlace,
          birthCountry:            data.birthCountry,
          postalCode:              data.postalCode,
          residenceAbroad:         data.residenceAbroad,
          street:                  data.street,
          occupation:              data.occupation,
          documentType:            data.documentType,
          documentNumber:          data.documentNumber,
          issuingAuthority:        data.issuingAuthority,
          issuedOn: data.issuedOn
            ? new Date(data.issuedOn).toISOString()
            : undefined,
          validUntil: data.validUntil
            ? new Date(data.validUntil).toISOString()
            : undefined,
          iban:                data.iban,
          country:             data.country,
          bic:                 data.bic,
          bankName:            data.bankName,
          isTaxResidentAT:     data.isTaxResidentAT,
          isTaxResidentOther:  data.isTaxResidentOther,
          gender:              data.gender,
          isSelfEmployed:      data.isSelfEmployed,
          taxResidencyCountry: data.taxResidencyCountry,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        console.error("Failed to update user info:", result.message);
      }
    } catch (error) {
      console.error("API error:", error);
    }

    // High-Risk & Tax Residency Checks — verbatim from V1.
    const isHighRiskCountry = (country: string) => highRiskCountries.includes(country);

    const isUSCitizen =
      data.nationality === "Vereinigte Staaten" ||
      data.country === "Vereinigte Staaten" ||
      (data.isTaxResidentOther && data.taxResidencyCountry === "Vereinigte Staaten");

    const isHighRisk =
      isHighRiskCountry(data.nationality) ||
      isHighRiskCountry(data.country || "") ||
      (data.isTaxResidentOther && isHighRiskCountry(data.taxResidencyCountry || ""));

    const livesOutsideAustria = data.country !== "Österreich";

    if (
      data.isPEP ||
      livesOutsideAustria ||
      isHighRisk ||
      isUSCitizen ||
      data.isTaxResidentOther // Second tax residency is a blocker
    ) {
      setIsPepStop(true);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    onSubmitted();
  };

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{ background: "linear-gradient(155deg, #dce8fb 0%, #edf4ff 28%, #f6faff 55%, #fdfeff 100%)" }}
    >
      <PrivacyPauseBanner />

      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-4 sm:p-6 md:p-8 max-w-6xl">
          <PersonalInfoForm formik={formik} highRiskCountries={highRiskCountries} />
        </div>
      </div>

      <div className="px-4 sm:px-6 md:px-8 pb-6 flex justify-end">
        <button
          type="button"
          onClick={() => { onPrimeAudio(); formik.handleSubmit(); }}
          disabled={submitting}
          className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Weiter
        </button>
      </div>

      {/* PEP Stop Screen — verbatim from V1 */}
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
                onClick={() => router.push("/customer/dashboard")}
                className="w-full px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Zurück zum Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
