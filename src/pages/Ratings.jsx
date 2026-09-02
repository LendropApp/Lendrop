import { useState } from "react";
import { Star } from "lucide-react";

// ---- Mock data ----
const mockReviews = [
  {
    id: 1,
    author: "Maria G.",
    rating: 5,
    comment:
      "Excelente comunicación y el artículo llegó exactamente como se describió.",
    date: "2026-08-20",
  },
  {
    id: 2,
    author: "Carlos R.",
    rating: 4,
    comment: "Buena experiencia, todo bien.",
    date: "2026-08-15",
  },
  {
    id: 3,
    author: "Ana P.",
    rating: 5,
    comment: "Súper recomendado, el trato fue muy amable.",
    date: "2026-08-02",
  },
];

// ---- Estrellas para mostrar una reseña ----
function StarDisplay({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={16}
          className={
            n <= rating
              ? "fill-[#a58cf4] text-[#a58cf4]"
              : "text-gray-300"
          }
        />
      ))}
    </div>
  );
}

// ---- Estrellas seleccionables ----
function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5"
        >
          <Star
            size={26}
            className={
              n <= (hover || value)
                ? "fill-[#a58cf4] text-[#a58cf4]"
                : "text-gray-300"
            }
          />
        </button>
      ))}
    </div>
  );
}

export default function Ratings() {
  const [reviews, setReviews] = useState(mockReviews);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const trimmedComment = comment.trim();
  const isValid = rating > 0 && trimmedComment.length > 0;

  function handleSubmit(e) {
    e.preventDefault();

    if (rating === 0) {
      setError("Selecciona una calificación de estrellas.");
      return;
    }

    if (trimmedComment.length === 0) {
      setError("Escribe un comentario antes de publicar.");
      return;
    }

    const newReview = {
      id: Date.now(),
      author: "Tú",
      rating,
      comment: trimmedComment,
      date: new Date().toISOString().split("T")[0],
    };

    setReviews([newReview, ...reviews]);
    setRating(0);
    setComment("");
    setError("");
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">

      {/* Navbar */}
      <nav className="bg-[#fafafa] border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center">
            <img
              src="/logo-lendrop.png"
              alt="Lendrop"
              className="h-10 w-auto"
            />
          </div>

          {/* Navigation */}
          <div
            className="hidden md:flex items-center gap-12 text-[#0d0d0d]"
            style={{ fontFamily: "Manrope" }}
          >
            <a
              href="#how-it-works"
              className="hover:text-[#433075] transition"
            >
              How it works
            </a>

            <a
              href="#categories"
              className="hover:text-[#433075] transition"
            >
              Categories
            </a>

            <a
              href="#security"
              className="hover:text-[#433075] transition"
            >
              Security
            </a>
          </div>

          {/* Buttons */}
          <div
            className="flex items-center gap-6"
            style={{ fontFamily: "Manrope" }}
          >
            <button className="text-[#0d0d0d] font-medium hover:text-[#433075] transition">
              Log in
            </button>

            <button className="bg-[#433075] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#37285f] transition">
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* Contenido */}
      <main className="px-4 py-8">
        <div className="mx-auto max-w-2xl">

          {/* Título */}
          <h1
            className="text-3xl font-bold text-[#433075]"
            style={{ fontFamily: "Space Grotesk" }}
          >
            Ratings & Reviews
          </h1>

          {/* Formulario */}
          <form
            onSubmit={handleSubmit}
            className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <p
              className="mb-3 text-sm font-medium text-[#0d0d0d]"
              style={{ fontFamily: "Manrope" }}
            >
              Deja tu reseña
            </p>

            <StarInput
              value={rating}
              onChange={setRating}
            />

            <textarea
              value={comment}
              onChange={(e) => {
                setComment(e.target.value);
                if (error) setError("");
              }}
              placeholder="Cuéntanos cómo fue tu experiencia..."
              rows={3}
              className="mt-4 w-full resize-none rounded-xl border border-gray-200 bg-[#fafafa] p-3 text-sm text-[#0d0d0d] outline-none focus:border-[#a58cf4] focus:ring-2 focus:ring-[#a58cf4]/30"
              style={{ fontFamily: "Manrope" }}
            />

            {error && (
              <p
                className="mt-2 text-sm text-red-500"
                style={{ fontFamily: "Manrope" }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!isValid}
              className="mt-4 rounded-xl bg-[#433075] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#37285f] disabled:cursor-not-allowed disabled:bg-gray-300"
              style={{ fontFamily: "Manrope" }}
            >
              Publicar reseña
            </button>
          </form>

          {/* Lista de reseñas */}
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            {reviews.length === 0 ? (
              <p
                className="py-6 text-center text-sm text-gray-400"
                style={{ fontFamily: "Manrope" }}
              >
                Todavía no hay reseñas.
              </p>
            ) : (
              reviews.map((review) => (
                <div
                  key={review.id}
                  className="border-b border-gray-100 py-5 last:border-0"
                >
                  <div className="mb-2 flex items-center justify-between">

                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#a58cf4]/20 text-sm font-semibold text-[#433075]"
                        style={{ fontFamily: "Manrope" }}
                      >
                        {review.author.charAt(0)}
                      </div>

                      <span
                        className="text-sm font-semibold text-[#0d0d0d]"
                        style={{ fontFamily: "Manrope" }}
                      >
                        {review.author}
                      </span>
                    </div>

                    <span
                      className="text-xs text-gray-400"
                      style={{ fontFamily: "Manrope" }}
                    >
                      {review.date}
                    </span>
                  </div>

                  <StarDisplay rating={review.rating} />

                  <p
                    className="mt-2 text-sm text-gray-600"
                    style={{ fontFamily: "Manrope" }}
                  >
                    {review.comment}
                  </p>
                </div>
              ))
            )}
          </div>

        </div>
      </main>
    </div>
  );
}