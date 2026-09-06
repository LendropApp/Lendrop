import { useState, useEffect } from "react";
import { Upload, X, Star } from "lucide-react";

const categories = [
  "Electronics",
  "Furniture",
  "Clothing",
  "Sports & Outdoors",
  "Tools",
  "Other",
];

const initialListing = {
  title: "Mountain Bike - Trek Marlin 7",
  description:
    "Well-maintained mountain bike, perfect for trails and city rides. Recently serviced.",
  price: "25",
  category: "Sports & Outdoors",
  photos: [
    "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=300&h=300&fit=crop",
    "https://images.unsplash.com/photo-1502744688674-c619d1586c9e?w=300&h=300&fit=crop",
  ],
};

export default function EditListing() {
  const [title, setTitle] = useState(initialListing.title);
  const [description, setDescription] = useState(initialListing.description);
  const [price, setPrice] = useState(initialListing.price);
  const [category, setCategory] = useState(initialListing.category);
  const [photos, setPhotos] = useState(initialListing.photos);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const hasChanges =
    title !== initialListing.title ||
    description !== initialListing.description ||
    price !== initialListing.price ||
    category !== initialListing.category ||
    JSON.stringify(photos) !== JSON.stringify(initialListing.photos);

  useEffect(() => {
    if (hasChanges) setSuccess(false);
  }, [hasChanges]);

  function handleRemovePhoto(index) {
    setPhotos(photos.filter((_, i) => i !== index));
  }

  function handleAddPhoto() {
    setPhotos([
      ...photos,
      `https://picsum.photos/seed/${Date.now()}/300/300`,
    ]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSuccess(false);

    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a description.");
      return;
    }

    if (!price || Number(price) <= 0) {
      setError("Please enter a valid price.");
      return;
    }

    if (photos.length === 0) {
      setError("Please add at least one photo.");
      return;
    }

    setError("");
    setSaving(true);

    // TODO: connect to Supabase update call
    setTimeout(() => {
      setSaving(false);
      setSuccess(true);
    }, 800);
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
            <a href="/explore" className="hover:text-[#433075]">
              Explore
            </a>
            <span>/</span>
            <a href="/dashboard" className="hover:text-[#433075]">
              My Listings
            </a>
            <span>/</span>
            <span className="text-gray-500">Edit</span>
          </div>

          {/* Title + subtitle */}
          <h1
            className="text-3xl font-bold text-[#433075]"
            style={{ fontFamily: "Space Grotesk" }}
          >
            Edit Listing
          </h1>
          <p
            className="mt-1 text-sm text-gray-500"
            style={{ fontFamily: "Manrope" }}
          >
            Editing "{initialListing.title}"
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-6 rounded-2xl border border-gray-200 bg-white shadow-sm"
          >

            {/* Photos section */}
            <div className="p-6">
              <label
                className="mb-3 block text-sm font-semibold text-[#0d0d0d]"
                style={{ fontFamily: "Manrope" }}
              >
                Photos
              </label>

              <div className="flex flex-wrap gap-3">
                {photos.map((photo, index) => (
                  <div key={index} className="relative h-24 w-24">
                    <img
                      src={photo}
                      alt={`Listing photo ${index + 1}`}
                      className="h-24 w-24 rounded-xl border border-gray-200 object-cover shadow-sm"
                    />

                    {index === 0 && (
                      <span
                        className="absolute bottom-1 left-1 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white"
                        style={{ fontFamily: "Manrope" }}
                      >
                        <Star size={10} className="fill-white" />
                        Cover
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddPhoto}
                  className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-[#a58cf4] hover:text-[#a58cf4]"
                >
                  <Upload size={18} />
                  <span className="text-xs" style={{ fontFamily: "Manrope" }}>
                    Add
                  </span>
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* Details section */}
            <div className="p-6">
              <label
                className="mb-1 block text-sm font-medium text-[#0d0d0d]"
                style={{ fontFamily: "Manrope" }}
              >
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mb-5 w-full rounded-xl border border-gray-200 bg-[#fafafa] p-3 text-sm text-[#0d0d0d] outline-none focus:border-[#a58cf4] focus:ring-2 focus:ring-[#a58cf4]/30"
                style={{ fontFamily: "Manrope" }}
              />

              <label
                className="mb-1 block text-sm font-medium text-[#0d0d0d]"
                style={{ fontFamily: "Manrope" }}
              >
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="mb-5 w-full resize-none rounded-xl border border-gray-200 bg-[#fafafa] p-3 text-sm text-[#0d0d0d] outline-none focus:border-[#a58cf4] focus:ring-2 focus:ring-[#a58cf4]/30"
                style={{ fontFamily: "Manrope" }}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-[#0d0d0d]"
                    style={{ fontFamily: "Manrope" }}
                  >
                    Price per day ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-[#fafafa] p-3 text-sm text-[#0d0d0d] outline-none focus:border-[#a58cf4] focus:ring-2 focus:ring-[#a58cf4]/30"
                    style={{ fontFamily: "Manrope" }}
                  />
                </div>

                <div>
                  <label
                    className="mb-1 block text-sm font-medium text-[#0d0d0d]"
                    style={{ fontFamily: "Manrope" }}
                  >
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-[#fafafa] p-3 text-sm text-[#0d0d0d] outline-none focus:border-[#a58cf4] focus:ring-2 focus:ring-[#a58cf4]/30"
                    style={{ fontFamily: "Manrope" }}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100" />

            {/* Footer: status + actions */}
            <div className="flex items-center justify-between p-6">
              <div>
                {error && (
                  <p
                    className="text-sm text-red-500"
                    style={{ fontFamily: "Manrope" }}
                  >
                    {error}
                  </p>
                )}

                {!error && success && (
                  <p
                    className="text-sm text-green-600"
                    style={{ fontFamily: "Manrope" }}
                  >
                    Listing updated successfully.
                  </p>
                )}

                {!error && !success && hasChanges && (
                  <p
                    className="flex items-center gap-1.5 text-sm text-amber-600"
                    style={{ fontFamily: "Manrope" }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Unsaved changes
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                  style={{ fontFamily: "Manrope" }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={!hasChanges || saving}
                  className="rounded-xl bg-[#433075] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#37285f] disabled:cursor-not-allowed disabled:bg-gray-300"
                  style={{ fontFamily: "Manrope" }}
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>

          </form>

        </div>
      </main>
    </div>
  );
}