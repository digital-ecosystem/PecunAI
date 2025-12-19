// PersonalInfoForm.tsx

import React from "react";
// import * as Yup from "yup";
import { useFormik } from "formik";
import { PersonalInfoFormData } from "@/types";

type PersonalInfoFormProps = {
  formik: ReturnType<typeof useFormik<PersonalInfoFormData>>;
  highRiskCountries?: string[];
};

// German country list for nationality and address
const GERMAN_COUNTRIES = [
  "Österreich",
  "Deutschland",
  "Schweiz",
  "Italien",
  "Frankreich",
  "Spanien",
  "Niederlande",
  "Belgien",
  "Polen",
  "Tschechien",
  "Ungarn",
  "Slowakei",
  "Slowenien",
  "Kroatien",
  "Vereinigtes Königreich",
  "Vereinigte Staaten",
  "Kanada",
  "Australien",
  "Indien",
  "Andere",
];

// Phone country codes simplified format
const PHONE_CODES = [
  { label: "AT +43", value: "+43" },
  { label: "DE +49", value: "+49" },
  { label: "CH +41", value: "+41" },
  { label: "IT +39", value: "+39" },
  { label: "FR +33", value: "+33" },
  { label: "ES +34", value: "+34" },
  { label: "NL +31", value: "+31" },
  { label: "BE +32", value: "+32" },
  { label: "PL +48", value: "+48" },
  { label: "CZ +420", value: "+420" },
  { label: "HU +36", value: "+36" },
  { label: "SK +421", value: "+421" },
  { label: "SI +386", value: "+386" },
  { label: "HR +385", value: "+385" },
  { label: "GB +44", value: "+44" },
  { label: "US +1", value: "+1" },
  { label: "CA +1", value: "+1" },
  { label: "AU +61", value: "+61" },
  { label: "IN +91", value: "+91" },
];

const PersonalInfoForm: React.FC<PersonalInfoFormProps> = (
  { formik, highRiskCountries = [] }
) => {
  // Combine and sort countries
  const allCountries = React.useMemo(() => {
    const combined = Array.from(new Set([...GERMAN_COUNTRIES, ...highRiskCountries]));
    return combined.sort((a, b) => a.localeCompare(b, 'de'));
  }, [highRiskCountries]);
  const renderField = (
    name: string,
    label: string,
    type = "text",
    customOnChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  ) => (
    <div className="w-full">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        onChange={customOnChange || formik.handleChange}
        onBlur={formik.handleBlur}
        value={
          typeof formik.values[name as keyof typeof formik.values] === "boolean"
            ? "" :
            type === "date"
              ? formik.values[name as keyof typeof formik.values]
                ? new Date(formik.values[name as keyof typeof formik.values] as string)
                  .toISOString()
                  .substring(0, 10)
                : ""
              : formik.values[name as keyof typeof formik.values] as string
        }
        className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm 
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                   transition-colors duration-200 ease-in-out
                   disabled:bg-gray-50 disabled:text-gray-500"
      />
      {formik.touched[name as keyof typeof formik.touched] &&
        formik.errors[name as keyof typeof formik.errors] && (
          <p className="text-red-500 text-xs mt-1">
            {formik.errors[name as keyof typeof formik.errors]}
          </p>
        )}
    </div>
  );


  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-2 lg:px-8">
      <form className="space-y-6 personal-info-form">
        {/* Personal Information Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Persönliche Informationen</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {renderField("firstName", "Vorname")}
            {renderField("lastName", "Nachname")}
            {renderField("birthPlace", "Geburtsort")}

            {/* Birth Country dropdown */}
            <div className="w-full">
              <label htmlFor="birthCountry" className="block text-sm font-medium text-gray-700 mb-1">
                Geburtsland
              </label>
              <select
                id="birthCountry"
                name="birthCountry"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.birthCountry}
                className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           transition-colors duration-200 ease-in-out
                           disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Bitte wählen...</option>
                {allCountries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
              {formik.touched.birthCountry && formik.errors.birthCountry && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.birthCountry}</p>
              )}
            </div>
            {renderField("birthDate", "Geburtsdatum", "date")}

            {/* Nationality dropdown */}
            <div className="w-full">
              <label htmlFor="nationality" className="block text-sm font-medium text-gray-700 mb-1">
                Nationalität
              </label>
              <select
                id="nationality"
                name="nationality"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.nationality}
                className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           transition-colors duration-200 ease-in-out
                           disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Bitte wählen...</option>
                <option value="">Bitte wählen...</option>
                {allCountries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
              {formik.touched.nationality && formik.errors.nationality && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.nationality}</p>
              )}
            </div>

            {/* Marital Status dropdown - German Translation */}
            <div className="w-full">
              <label htmlFor="maritalStatus" className="block text-sm font-medium text-gray-700 mb-1">
                Familienstand
              </label>
              <select
                id="maritalStatus"
                name="maritalStatus"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.maritalStatus}
                className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           transition-colors duration-200 ease-in-out
                           disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Bitte wählen...</option>
                <option value="Single">Ledig</option>
                <option value="Married">Verheiratet</option>
                <option value="Divorced">Geschieden</option>
                <option value="Widowed">Verwitwet</option>
              </select>
              {formik.touched.maritalStatus && formik.errors.maritalStatus && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.maritalStatus}</p>
              )}
            </div>
            {/* Gender dropdown */}
            <div className="w-full">
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">
                Geschlecht
              </label>
              <select
                id="gender"
                name="gender"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.gender}
                className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           transition-colors duration-200 ease-in-out
                           disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Bitte wählen...</option>
                <option value="male">Männlich</option>
                <option value="female">Weiblich</option>
                {/* <option value="diverse">Divers</option> */}
              </select>
              {formik.touched.gender && formik.errors.gender && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.gender}</p>
              )}
            </div>
          </div>
        </div>

        {/* Account Data Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Kontodaten</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {renderField("iban", "IBAN", "text", (e) => {
              const { value } = e.target;
              formik.setFieldValue("iban", value.toUpperCase().replace(/\s/g, ""));
            })}
            {renderField("bic", "BIC")}
            {renderField("bankName", "Name der Bank")}
          </div>
        </div>

        {/* Address Information Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Adressinformationen</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {renderField("street", "Straße")}
            {renderField("houseNumber", "Hausnummer")}
            {renderField("postalCode", "Postleitzahl")}
            {renderField("city", "Stadt")}

            {/* Country dropdown */}
            <div className="w-full">
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1">
                Land
              </label>
              <select
                id="country"
                name="country"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.country}
                className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           transition-colors duration-200 ease-in-out
                           disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Bitte wählen...</option>
                <option value="">Bitte wählen...</option>
                {allCountries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
              {formik.touched.country && formik.errors.country && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.country}</p>
              )}
            </div>
          </div>
        </div>

        {/* Contact Information Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Kontaktinformationen</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {/* Country Code dropdown - Simplified */}
            <div className="w-full">
              <label htmlFor="countryCode" className="block text-sm font-medium text-gray-700 mb-1">
                Ländervorwahl
              </label>
              <select
                id="countryCode"
                name="countryCode"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.countryCode || "+43"}
                className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           transition-colors duration-200 ease-in-out
                           disabled:bg-gray-50 disabled:text-gray-500"
              >
                {PHONE_CODES.map((code) => (
                  <option key={code.label} value={code.value}>
                    {code.label}
                  </option>
                ))}
              </select>
              {formik.touched.countryCode && formik.errors.countryCode && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.countryCode}</p>
              )}
            </div>

            {renderField("phone", "Telefonnummer")}
            {/* Email field, pre-filled but editable */}
            <div className="w-full">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                E-Mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.email}
                className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           transition-colors duration-200 ease-in-out
                           disabled:bg-gray-50 disabled:text-gray-500"
              />
              {formik.touched.email && formik.errors.email && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.email}</p>
              )}
            </div>
          </div>
        </div>

        {/* Professional Information Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Berufliche Informationen</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {renderField("education", "Ausbildung")}
            {renderField("currentJob", "Aktueller Beruf")}
            {renderField("industry", "Branche")}
            {renderField("occupation", "Tätigkeit")}

            {/* Self-Employed Question */}
            <div className="w-full">
              <p className="text-sm font-medium text-gray-700 mb-3">Selbstständig</p>
              <div className="flex gap-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="isSelfEmployed"
                    value="true"
                    checked={formik.values.isSelfEmployed == true}
                    onChange={() => formik.setFieldValue("isSelfEmployed", true)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Ja</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="isSelfEmployed"
                    value="false"
                    checked={formik.values.isSelfEmployed == false}
                    onChange={() => formik.setFieldValue("isSelfEmployed", false)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Nein</span>
                </label>
              </div>
              {formik.touched.isSelfEmployed && formik.errors.isSelfEmployed && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.isSelfEmployed}</p>
              )}
            </div>
          </div>
        </div>

        {/* Document Information Section */}
        {/* Document Type dropdown - Corrected */}
        {/* <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ausweisdokument</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            <div className="w-full">
              <label htmlFor="documentType" className="block text-sm font-medium text-gray-700 mb-1">
                Art des Ausweisdokuments
              </label>
              <select
                id="documentType"
                name="documentType"
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                value={formik.values.documentType}
                className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                           transition-colors duration-200 ease-in-out
                           disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Bitte wählen...</option>
                <option value="passport">Reisepass</option>
                <option value="identity_card">Personalausweis</option>
                <option value="drivers_license">Führerschein</option>
              </select>
              {formik.touched.documentType && formik.errors.documentType && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.documentType}</p>
              )}
            </div>

            {renderField("documentNumber", "Dokumentnummer")}
            {renderField("issuingAuthority", "Ausstellende Behörde")}
            {renderField("issuedOn", "Ausstellungsdatum", "date")}
            {renderField("validUntil", "Gültig bis", "date")}
          </div>
        </div> */}

        {/* Tax Information Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Steuerliche Informationen</h3>
          <div className="space-y-4">
            {/* Question 1: Tax resident in Austria */}
            <div className="w-full">
              <p className="text-sm font-medium text-gray-700 mb-3">Sind Sie in Österreich steueransässig?</p>
              <div className="flex gap-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="isTaxResidentAT"
                    value="true"
                    checked={formik.values.isTaxResidentAT == true}
                    onChange={(e) => {
                      formik.setFieldValue("isTaxResidentAT", e.target.value === "true");
                      formik.setFieldTouched("isTaxResidentAT", true, false);
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Ja</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="isTaxResidentAT"
                    value="false"
                    checked={formik.values.isTaxResidentAT == false}
                    onChange={(e) => {
                      formik.setFieldValue("isTaxResidentAT", e.target.value === "true");
                      formik.setFieldTouched("isTaxResidentAT", true, false);
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Nein</span>
                </label>
              </div>
              {formik.touched.isTaxResidentAT &&
                formik.errors.isTaxResidentAT && (
                  <p className="text-red-500 text-xs mt-1">{formik.errors.isTaxResidentAT}</p>
                )}

            </div>
            {/* Question 2: Tax resident in another country */}
            <div className="w-full">
              <p className="text-sm font-medium text-gray-700 mb-3">Sind Sie in einem weiteren Land steueransässig?</p>
              <div className="flex gap-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="isTaxResidentOther"
                    value="true"
                    checked={formik.values.isTaxResidentOther == true}
                    onChange={(e) => {
                      formik.setFieldValue("isTaxResidentOther", e.target.value === "true");
                      formik.setFieldTouched("isTaxResidentOther", true, false);
                    }}
                    onBlur={formik.handleBlur}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Ja</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="isTaxResidentOther"
                    value="false"
                    checked={formik.values.isTaxResidentOther == false}
                    onChange={(e) => {
                      formik.setFieldValue("isTaxResidentOther", e.target.value === "true");
                      formik.setFieldTouched("isTaxResidentOther", true, false);
                      if (e.target.value === "false") {
                        formik.setFieldValue("taxResidencyCountry", "");
                      }
                    }}
                    onBlur={formik.handleBlur}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Nein</span>
                </label>
              </div>
              {formik.touched.isTaxResidentOther && formik.errors.isTaxResidentOther && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.isTaxResidentOther}</p>
              )}
            </div>

            {/* Conditional: Show country dropdown if Question 2 = Yes */}
            {formik.values.isTaxResidentOther === true && (
              <div className="w-full">
                <label htmlFor="taxResidencyCountry" className="block text-sm font-medium text-gray-700 mb-1">
                  Zusätzliches Steueransässigkeitsland
                </label>
                <select
                  id="taxResidencyCountry"
                  name="taxResidencyCountry"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.taxResidencyCountry}
                  className="w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                             transition-colors duration-200 ease-in-out
                             disabled:bg-gray-50 disabled:text-gray-500"
                >
                  <option value="">Bitte wählen...</option>
                  {allCountries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
                {formik.touched.taxResidencyCountry && formik.errors.taxResidencyCountry && (
                  <p className="text-red-500 text-xs mt-1">{formik.errors.taxResidencyCountry}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Additional Options Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Zusätzliche Optionen</h3>
          <div className="space-y-4">
            {/* PEP Question - Full German Text */}
            {/* PEP Question - Radio Buttons */}
            <div className="w-full">
              <p className="text-sm font-medium text-gray-700 mb-3">Politisch Exponierte Person</p>
              <p className="text-sm text-gray-500 mb-3 leading-relaxed">
                Sind Sie eine politisch exponierte Person (PEP) oder stehen Sie in einem Naheverhältnis zu einer politisch exponierten Person (z. B. verwandt oder verschwägert)?
              </p>
              <div className="flex gap-6">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="isPEP"
                    value="true"
                    checked={formik.values.isPEP === true}
                    onChange={() => {
                      formik.setFieldValue("isPEP", true);
                      formik.setFieldTouched("isPEP", true, false);
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Ja</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="isPEP"
                    value="false"
                    checked={formik.values.isPEP === false}
                    onChange={() => {
                      formik.setFieldValue("isPEP", false);
                      formik.setFieldTouched("isPEP", true, false);
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">Nein</span>
                </label>
              </div>
              {(formik.touched.isPEP || formik.submitCount > 0) && formik.errors.isPEP && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.isPEP}</p>
              )}
            </div>

            {/* <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                name="residenceAbroad"
                id="residenceAbroad"
                checked={formik.values.residenceAbroad}
                onChange={formik.handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded 
                           mt-0.5 flex-shrink-0"
              />
              <label htmlFor="residenceAbroad" className="text-sm text-gray-700 leading-5">
                Haben Sie einen Wohnsitz im Ausland?
              </label>
            </div> */}

            {
              process.env.NEXT_PUBLIC_ENV === 'development' && (
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    name="magicFlow"
                    id="magicFlow"
                    checked={formik.values.magicFlow}
                    onChange={formik.handleChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded 
                              mt-0.5 flex-shrink-0"
                  />
                  <label htmlFor="magicFlow" className="text-sm text-gray-700 leading-5">
                    Magic Flow (SignD – Testzwecke)
                  </label>
                </div>
              )
            }
          </div>
        </div>

        {/* Submit Button on Right side */}
        {/* <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Submit
          </button>
        </div> */}
      </form>
    </div>
  );
};

export default PersonalInfoForm;
