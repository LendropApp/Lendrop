import { useState } from "react";
import { Upload, CheckCircle2, Clock, XCircle, AlertCircle, Camera } from "lucide-react";

// Mock status — change this to preview each state:
// "not_started" | "pending" | "in_review" | "approved" | "rejected"
const initialStatus = "not_started";

function StatusBanner({ status }) {
  const config = {
    not_started: null,
    pending: {
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
      title: "Verification pending",
      message: "Please upload your document and a selfie to continue.",
    },
    in_review: {
      icon: Clock,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
      title: "Under review",
      message: "We're reviewing your documents. This usually takes less than 24 hours.",
    },
    approved: {
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
      title: "Identity verified",
      message: "Your identity has been successfully verified.",
    },
    rejected: {
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200",
      title: "Verification failed",
      message: "We couldn't verify your identity. Please try again with clearer photos.",
    },
  };

  const current = config[status];
  if (!current) return null;

  const Icon = current.icon;

  return (
    <div
      className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 ${current.bg} ${current.border}`}
    >
      <Icon size={20} className={`mt-0.5 shrink-0 ${current.color}`} />
      <div>
        <p
          className={`text-sm font-semibold ${current.color}`}
          style={{ fontFamily: "Manrope" }}
        >
          {current.title}
        </p>
        <p
          className="mt-0.5 text-sm text-gray-600"
          style={{ fontFamily: "Manrope" }}
        >
          {current.message}
        </p>
      </div>
    </div>
  );
}

function UploadBox({ label, description, icon: Icon, image, onUpload, onRemove }) {
  return (
    <div>
      <p
        className="mb-1 text-sm font-medium text-[#0d0d0d]"
        style={{ fontFamily: "Manrope" }}
      >
        {label}
      </p>
      <p
        className="mb-3 text-xs text-gray-500"
        style={{ fontFamily: "Manrope" }}
      >
        {description}
      </p>

      {image ? (
        <div className="relative">
          <img
            src={image}
            alt={label}
            className="h-48 w-full rounded-xl border border-gray-200 object-cover"
          />
          <button
            type="button"
            onClick={onRemove}
            className="absolute right-2 top-2 rounded-lg bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm hover:text-red-500"
            style={{ fontFamily: "Manrope" }}
          >
            Retake
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onUpload}
          className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-[#a58cf4] hover:text-[#a58cf4]"
        >
          <Icon size={28} />
          <span className="text-sm" style={{ fontFamily: "Manrope" }}>
            Upload photo
          </span>
        </button>
      )}
    </div>
  );
}

export default function IdentityVerification() {
  const [status, setStatus] = useState(initialStatus);
  const [document, setDocument] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [error, setError] = useState("");

  const canSubmit = document && selfie;
  const isLocked = status === "in_review" || status === "approved";

  function handleUploadDocument() {
    setDocument("https://images.unsplash.com/photo-1595079676339-1534801ad6cf?w=500&h=300&fit=crop");
  }

  function handleUploadSelfie() {
    setSelfie("https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=500&h=300&fit=crop");
  }

  function handleSubmit(e) {
    e.preventDefault();

    if (!document) {
      setError("Please upload a photo of your ID document.");
      return;
    }

    if (!selfie) {
      setError("Please upload a selfie.");
      return;
    }

    setError("");
    setStatus("in_review");

    // TODO: connect to identity verification service (handled separately)
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">

      {/* Navbar */}
      <nav className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">

          <div className="flex items-center">
            <img
              src="/logo-lendrop.png"
              alt="Lendrop"
              className="h-10 w-auto"
            />
          </div>

          <div className="flex items-center gap-10 font-medium text-[#0d0d0d]">
            <a href="/" className="transition hover:text-[#433075]">
              Home
            </a>
            <a href="/explore" className="transition hover:text-[#433075]">
              Explore
            </a>
            <a href="/help" className="transition hover:text-[#433075]">
              Help
            </a>
            <a
              href="/profile"
              className="flex items-center gap-2 transition hover:text-[#433075]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4z"
                />
              </svg>
              <span>Profile</span>
            </a>
          </div>
        </div>
      </nav>

      <main className="px-4 py-8">
        <div className="mx-auto max-w-2xl">

          {/* Breadcrumb */}
          <div
            className="mb-2 flex items-center gap-1.5 text-sm text-gray-400"
            style={{ fontFamily: "Manrope" }}
          >
            <a href="/profile" className="hover:text-[#433075]">
              Profile
            </a>
            <span>/</span>
            <span className="text-gray-500">Identity Verification</span>
          </div>

          <h1
            className="text-3xl font-bold text-[#433075]"
            style={{ fontFamily: "Space Grotesk" }}
          >
            Identity Verification
          </h1>
          <p
            className="mt-1 text-sm text-gray-500"
            style={{ fontFamily: "Manrope" }}
          >
            Verify your identity to build trust with other users on Lendrop.
          </p>

          <div className="mt-6">
            <StatusBanner status={status} />
          </div>

          {status === "approved" ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
              <CheckCircle2 size={40} className="mx-auto mb-3 text-green-600" />
              <p
                className="text-lg font-semibold text-[#0d0d0d]"
                style={{ fontFamily: "Manrope" }}
              >
                You're all set!
              </p>
              <p
                className="mt-1 text-sm text-gray-500"
                style={{ fontFamily: "Manrope" }}
              >
                A verified badge will appear on your public profile.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2">
                <UploadBox
                  label="ID document (DUI)"
                  description="Upload a clear photo of the front of your DUI."
                  icon={Upload}
                  image={document}
                  onUpload={handleUploadDocument}
                  onRemove={() => setDocument(null)}
                />

                <UploadBox
                  label="Selfie"
                  description="Take a clear photo of your face, well lit and centered."
                  icon={Camera}
                  image={selfie}
                  onUpload={handleUploadSelfie}
                  onRemove={() => setSelfie(null)}
                />
              </div>

              <div className="border-t border-gray-100" />

              <div className="flex items-center justify-between p-6">
                <div>
                  {error && (
                    <p
                      className="flex items-center gap-1.5 text-sm text-red-500"
                      style={{ fontFamily: "Manrope" }}
                    >
                      <AlertCircle size={14} />
                      {error}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit || isLocked}
                  className="rounded-xl bg-[#433075] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#37285f] disabled:cursor-not-allowed disabled:bg-gray-300"
                  style={{ fontFamily: "Manrope" }}
                >
                  {status === "in_review" ? "Submitted" : "Submit for review"}
                </button>
              </div>
            </form>
          )}

        </div>
      </main>
    </div>
  );
}