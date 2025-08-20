export default function SignatureSuccess() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-green-50 text-center px-6">
      <h1 className="text-3xl font-bold text-green-600 mb-4">Signature Submitted Successfully!</h1>
      <p className="text-gray-700 text-lg mb-8">
        Thank you! Your signature has been received and recorded.
      </p>
        {/* <button className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition">Go to Dashboard</button> */}
    </div>
  );
}