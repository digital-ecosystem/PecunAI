// app/signd/page.tsx
'use client';

import { useState } from 'react';
import { useSignD } from '../../hooks/useSignD';
import { SignDIframe } from '../../components/SignDIframe';
import { SignDHandshakePayload } from '../../types/signd';

// Test credentials from the documentation
const TEST_CREDENTIALS = {
  login: '83212e3b-6ff3-4cfe-afe3-80f107d8ae20',
  token: 'TD5QZ22FAmh3IMd8ozeuwG9kVCkwcmsbPhy1KPWaMaAaGKiMmOHPsRm7MGaeRbQ8',
};

const SignDPage = () => {
  const {
    isLoading,
    error,
    sessionData,
    result,
    createSession,
    getResult,
    downloadIDV,
    getIframeUrl,
    setError,
  } = useSignD(TEST_CREDENTIALS);

  const [formData, setFormData] = useState({
    type: 'identification' as 'signature' | 'identification',
    firstName: 'John',
    lastName: 'Doe',
    dob: '1981-12-24',
    phoneNumber: '+43123456789',
    email: 'john@doe.com',
    street: 'Johannesgasse',
    number: '12',
    zip: '1010',
    city: 'Wien',
    countryCode: 'AT',
    magicFlow: true, // For testing
  });

  const [showIframe, setShowIframe] = useState(false);

  const handleStartIdentification = async () => {
    try {
      const payload: Omit<SignDHandshakePayload, 'login' | 'token'> = {
        type: formData.type,
        attributes: {
          individual: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            dob: formData.dob,
            phone_number: formData.phoneNumber,
            email: formData.email,
          },
          address: {
            street: formData.street,
            number: formData.number,
            zip: formData.zip,
            city: formData.city,
            country_code: formData.countryCode,
          },
        },
        settings: {
          redirect_success_url: 'http://localhost:3000/success',
          redirect_error_url: 'http://localhost:3000/error',
        },
        magic_flow: formData.magicFlow,
      };

      await createSession(payload);
      setShowIframe(true);
    } catch (err) {
      console.error('Failed to start identification:', err);
    }
  };

  const handleSuccess = async () => {
    if (sessionData?.session_token) {
      try {
        await getResult(sessionData.session_token);
        setShowIframe(false);
      } catch (err) {
        console.error('Failed to get result:', err);
      }
    }
  };

  const handleDownloadIDV = async () => {
    if (sessionData?.session_token) {
      try {
        await downloadIDV(sessionData.session_token);
      } catch (err) {
        console.error('Failed to download IDV:', err);
      }
    }
  };

  // const inputField = `mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500`;

  const inputField = 'px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">SignD Identity Verification</h1>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-md">{error}</div>
      )}

      {!showIframe && (
        <div className="bg-white shadow rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">Verification Form</h2>

          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Verification Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'signature' | 'identification' })}
              className={`${inputField} mt-1 block w-full`}
            >
              <option value="identification">Identification</option>
              <option value="signature">Signature</option>
            </select>
          </div>

          {/* Personal Info */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="First Name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className={inputField}
              />
              <input
                type="text"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className={inputField}
              />
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                className={inputField}
              />
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="tel"
                placeholder="Phone Number"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className={inputField}
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={inputField}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-3">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Street"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                className={inputField}
              />
              <input
                type="text"
                placeholder="House Number"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                className={inputField}
              />
              <input
                type="text"
                placeholder="ZIP Code"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                className={inputField}
              />
              <input
                type="text"
                placeholder="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className={inputField}
              />
              <input
                type="text"
                placeholder="Country Code (AT, DE, GB)"
                maxLength={2}
                value={formData.countryCode}
                onChange={(e) => setFormData({ ...formData, countryCode: e.target.value.toUpperCase() })}
                className={inputField}
              />
            </div>
          </div>

          {/* Settings */}
          <div className="flex items-center space-x-2">
            <input
              id="magicFlow"
              type="checkbox"
              checked={formData.magicFlow}
              onChange={(e) => setFormData({ ...formData, magicFlow: e.target.checked })}
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="magicFlow" className="text-sm text-gray-700">
              Enable Magic Flow (Test Mode)
            </label>
          </div>

          <button
            onClick={handleStartIdentification}
            disabled={isLoading}
            className="w-full py-2 px-4 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Starting...' : 'Start Verification'}
          </button>
        </div>
      )}

      {showIframe && sessionData && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Identity Verification Process</h2>
            <button
              onClick={() => setShowIframe(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <SignDIframe
            src={getIframeUrl(sessionData.session_token, 'en', formData.magicFlow)}
            onSuccess={handleSuccess}
            onError={(error) => setError(error?.description)}
            onUserCanceled={() => setShowIframe(false)}
            onSignatureToken={(token) => downloadIDV(token)}
            className="rounded-md border border-gray-200"
          />
        </div>
      )}

      {result && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Verification Result</h2>
            <button
              onClick={handleDownloadIDV}
              className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
            >
              Download IDV PDF
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Personal Information</h3>
              <dl className="text-sm space-y-1">
                <div className="flex">
                  <dt className="font-medium text-gray-500 w-20">Name:</dt>
                  <dd>{result.individual.first_name} {result.individual.last_name}</dd>
                </div>
                <div className="flex">
                  <dt className="font-medium text-gray-500 w-20">DOB:</dt>
                  <dd>{result.individual.dob}</dd>
                </div>
                <div className="flex">
                  <dt className="font-medium text-gray-500 w-20">Phone:</dt>
                  <dd>{result.individual.mobile_number}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Address</h3>
              <dl className="text-sm space-y-1">
                <div className="flex">
                  <dt className="font-medium text-gray-500 w-20">Street:</dt>
                  <dd>{result.address.street} {result.address.number}</dd>
                </div>
                <div className="flex">
                  <dt className="font-medium text-gray-500 w-20">City:</dt>
                  <dd>{result.address.zip} {result.address.city}</dd>
                </div>
                <div className="flex">
                  <dt className="font-medium text-gray-500 w-20">Country:</dt>
                  <dd>{result.address.country_code}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Document Information</h3>
              <dl className="text-sm space-y-1">
                <div className="flex">
                  <dt className="font-medium text-gray-500 w-20">Type:</dt>
                  <dd>{result.id.type}</dd>
                </div>
                <div className="flex">
                  <dt className="font-medium text-gray-500 w-20">Number:</dt>
                  <dd>{result.id.number}</dd>
                </div>
                <div className="flex">
                  <dt className="font-medium text-gray-500 w-20">Expires:</dt>
                  <dd>{result.id.expiration_date}</dd>
                </div>
              </dl>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Risk Scores</h3>
              <dl className="text-sm space-y-1">
                <div className="flex">
                  <dt className="font-medium text-gray-500 w-20">Risk 1:</dt>
                  <dd>{result.scores.risk_1}</dd>
                </div>
                <div className="flex">
                  <dt className="font-medium text-gray-500 w-20">Risk 2:</dt>
                  <dd>{result.scores.risk_2}</dd>
                </div>
                <div className="flex">
                  <dt className="font-medium text-gray-500 w-20">Total:</dt>
                  <dd className="font-medium">{result.scores.total}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SignDPage;