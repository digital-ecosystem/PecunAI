export default function SignatureError() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-red-50 text-center px-6">
      <h1 className="text-3xl font-bold text-red-600 mb-4">Oops! Something went wrong</h1>
      <p className="text-gray-700 text-lg mb-8">
        We could not process your signature. Please try again or contact support.
      </p>
        <button className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 transition">Try Again</button>
    </div>
  );
}