// PersonalInfoForm.tsx

import React from "react";
// import * as Yup from "yup";
import { useFormik } from "formik";
import { PersonalInfoFormData } from "@/types";

type PersonalInfoFormProps = {
  // onSubmit: (values: PersonalInfoFormData) => void;
  formik: ReturnType<typeof useFormik<PersonalInfoFormData>>;
};

// const validationSchema = Yup.object({
//   firstName: Yup.string()
//     .min(2, "First name must be at least 2 characters")
//     .max(50, "First name must be at most 50 characters")
//     .required("First name is required"),

//   lastName: Yup.string()
//     .min(2, "Last name must be at least 2 characters")
//     .max(50, "Last name must be at most 50 characters")
//     .required("Last name is required"),

//   birthPlace: Yup.string()
//     .min(2, "Place of birth must be at least 2 characters")
//     .required("Place of birth is required"),

//   nationality: Yup.string()
//     .min(2, "Nationality must be at least 2 characters")
//     .required("Nationality is required"),

//   birthDate: Yup.date()
//     .max(new Date(), "Birth date cannot be in the future")
//     .required("Birth date is required"),

//   maritalStatus: Yup.string()
//     .oneOf(["Single", "Married", "Divorced", "Widowed"], "Invalid marital status")
//     .required("Marital status is required"),

//   street: Yup.string()
//     .min(2, "Street must be at least 2 characters")
//     .required("Street is required"),

//   houseNumber: Yup.string()
//     .matches(/^[a-zA-Z0-9/-]{1,10}$/, "Invalid house number")
//     .required("House number is required"),

//   postalCode: Yup.string()
//     .matches(/^\d{4,10}$/, "Postal code must be 4 to 10 digits")
//     .required("Postal code is required"),

//   city: Yup.string()
//     .min(2, "City must be at least 2 characters")
//     .required("City is required"),

//   phone: Yup.string()
//     .matches(/^\+?\d{7,15}$/, "Phone number must be 7 to 15 digits, optionally starting with '+'")
//     .required("Phone number is required"),

//   email: Yup.string()
//     .email("Invalid email format")
//     .required("Email is required"),

//   education: Yup.string()
//     .min(2, "Education field must be at least 2 characters")
//     .required("Education is required"),

//   currentJob: Yup.string()
//     .min(2, "Current job must be at least 2 characters")
//     .required("Current job is required"),

//   industry: Yup.string()
//     .min(2, "Industry must be at least 2 characters")
//     .required("Industry is required"),

//   occupation: Yup.string()
//     .min(2, "Occupation must be at least 2 characters")
//     .required("Occupation is required"),

//   documentType: Yup.string()
//     .oneOf(["passport", "identity_card", "drivers_license"], "Invalid document type")
//     .required("Document type is required"),

//   documentNumber: Yup.string()
//     .matches(/^[a-zA-Z0-9]{4,20}$/, "Document number must be 4–20 alphanumeric characters")
//     .required("Document number is required"),

//   issuingAuthority: Yup.string()
//     .min(2, "Issuing authority must be at least 2 characters")
//     .required("Issuing authority is required"),

//   issuedOn: Yup.date()
//     .required("Issue date is required")
//     .max(new Date(), "Issue date can't be in the future"),

//   validUntil: Yup.date()
//     .min(Yup.ref("issuedOn"), "Valid until must be after issue date")
//     .required("Valid until date is required"),
// });


const PersonalInfoForm: React.FC<PersonalInfoFormProps> = (
  { formik }
) => {

  // const formik = useFormik({
  //   initialValues: {
  //     firstName: "",
  //     lastName: "",
  //     birthPlace: "",
  //     nationality: "",
  //     birthDate: "",
  //     maritalStatus: "",
  //     street: "",
  //     houseNumber: "",
  //     postalCode: "",
  //     city: "",
  //     phone: "",
  //     email: "",
  //     education: "",
  //     currentJob: "",
  //     industry: "",
  //     occupation: "",
  //     documentType: "",
  //     documentNumber: "",
  //     issuingAuthority: "",
  //     issuedOn: "",
  //     validUntil: "",
  //     isPEP: false,
  //     residenceAbroad: false,
  //     actingFor: ""
  //   },
  //   validationSchema,
  //   onSubmit: (values: PersonalInfoFormData) => {
  //     onSubmit(values);
  //   },
  // });

  const renderField = (
    name: string,
    label: string,
    type = "text"
  ) => (
    <div className="w-full">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        onChange={formik.handleChange}
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {renderField("firstName", "First Name")}
            {renderField("lastName", "Last Name")}
            {renderField("birthPlace", "Place of Birth")}
            {renderField("birthDate", "Birth Date", "date")}
                        {renderField("iban", "IBAN")}
            
            {/* Nationality dropdown */}
            <div className="w-full">
              <label htmlFor="nationality" className="block text-sm font-medium text-gray-700 mb-1">
                Nationality
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
                <option value="">Select nationality...</option>
                <option value="Austria">Austria</option>
                <option value="Germany">Germany</option>
                <option value="Switzerland">Switzerland</option>
                <option value="Italy">Italy</option>
                <option value="France">France</option>
                <option value="Spain">Spain</option>
                <option value="Netherlands">Netherlands</option>
                <option value="Belgium">Belgium</option>
                <option value="Poland">Poland</option>
                <option value="Czech Republic">Czech Republic</option>
                <option value="Hungary">Hungary</option>
                <option value="Slovakia">Slovakia</option>
                <option value="Slovenia">Slovenia</option>
                <option value="Croatia">Croatia</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="United States">United States</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
                <option value="India">India</option>
                <option value="Other">Other</option>
              </select>
              {formik.touched.nationality && formik.errors.nationality && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.nationality}</p>
              )}
            </div>

            {/* Marital Status dropdown */}
            <div className="w-full">
              <label htmlFor="maritalStatus" className="block text-sm font-medium text-gray-700 mb-1">
                Marital Status
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
                <option value="">Select status...</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
              {formik.touched.maritalStatus && formik.errors.maritalStatus && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.maritalStatus}</p>
              )}
            </div>
          </div>
        </div>

        {/* Address Information Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {renderField("street", "Street")}
            {renderField("houseNumber", "House Number")}
            {renderField("postalCode", "Postal Code")}
            {renderField("city", "City")}
          </div>
        </div>

        {/* Contact Information Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {/* Country Code dropdown */}
            <div className="w-full">
              <label htmlFor="countryCode" className="block text-sm font-medium text-gray-700 mb-1">
                Country Code
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
                <option value="+43">🇦🇹 +43 (Austria)</option>
                <option value="+49">🇩🇪 +49 (Germany)</option>
                <option value="+41">🇨🇭 +41 (Switzerland)</option>
                <option value="+39">🇮🇹 +39 (Italy)</option>
                <option value="+33">🇫🇷 +33 (France)</option>
                <option value="+34">🇪🇸 +34 (Spain)</option>
                <option value="+31">🇳🇱 +31 (Netherlands)</option>
                <option value="+32">🇧🇪 +32 (Belgium)</option>
                <option value="+48">🇵🇱 +48 (Poland)</option>
                <option value="+420">🇨🇿 +420 (Czech Republic)</option>
                <option value="+36">🇭🇺 +36 (Hungary)</option>
                <option value="+421">🇸🇰 +421 (Slovakia)</option>
                <option value="+386">🇸🇮 +386 (Slovenia)</option>
                <option value="+385">🇭🇷 +385 (Croatia)</option>
                <option value="+44">🇬🇧 +44 (United Kingdom)</option>
                <option value="+1">🇺🇸 +1 (United States)</option>
                <option value="+1">🇨🇦 +1 (Canada)</option>
                <option value="+61">🇦🇺 +61 (Australia)</option>
                <option value="+91">🇮🇳 +91 (India)</option>
              </select>
              {formik.touched.countryCode && formik.errors.countryCode && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.countryCode}</p>
              )}
            </div>
            
            {renderField("phone", "Phone Number")}
            {/* Email field, pre-filled but editable */}
            <div className="w-full">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {renderField("education", "Education")}
            {renderField("currentJob", "Current Job")}
            {renderField("industry", "Industry")}
            {renderField("occupation", "Occupation")}
          </div>
        </div>

        {/* Document Information Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {/* Document Type dropdown */}
            <div className="w-full">
              <label htmlFor="documentType" className="block text-sm font-medium text-gray-700 mb-1">
                Document Type
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
                <option value="">Select...</option>
                <option value="passport">Passport</option>
                <option value="identity_card">Identity Card</option>
                <option value="drivers_license">Driver License</option>
              </select>
              {formik.touched.documentType && formik.errors.documentType && (
                <p className="text-red-500 text-xs mt-1">{formik.errors.documentType}</p>
              )}
            </div>

            {renderField("documentNumber", "Document Number")}
            {renderField("issuingAuthority", "Issuing Authority")}
            {renderField("issuedOn", "Issued On", "date")}
            {renderField("validUntil", "Valid Until", "date")}
          </div>
        </div>

        {/* Additional Options Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Options</h3>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                name="isPEP"
                id="isPEP"
                checked={formik.values.isPEP}
                onChange={formik.handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded 
                           mt-0.5 flex-shrink-0"
              />
              <label htmlFor="isPEP" className="text-sm text-gray-700 leading-5">
                Politically Exposed Person (PEP)
              </label>
            </div>

            <div className="flex items-start space-x-3">
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
                Do you have a residence abroad?
              </label>
            </div>

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
                Magic Flow (SignD - Testing Purpose)
              </label>
            </div>
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
