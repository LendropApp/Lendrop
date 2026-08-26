import React, { useState } from "react";
import {
  ShieldCheck,
  MapPin,
  Star,
  MessageCircle,
  Package,
  ChevronDown,
  Sparkles,
} from "lucide-react";

/**
 * LendropProfileView
 * ---------------------------------------------------------------------
 * Plantilla de PERFIL PÚBLICO (perfil de arrendador), inspirada en la
 * página de perfil de anfitrión de Airbnb, con el sistema de marca de
 * Lendrop (locker inteligente + confianza).
 *
 * Componente 100% presentacional: recibe `profile`, `items` y `reviews`
 * como props (con datos mock por defecto para poder visualizarlo
 * standalone). Al integrar con Supabase, reemplazar los defaults por:
 *
 *   profile  -> tabla `profiles` + `profile_private` (RLS, solo owner ve lo privado)
 *   items    -> tabla `items`   WHERE owner_id = profile.id
 *   reviews  -> tabla `reviews` WHERE target_id = profile.id
 *
 * No cambiar la forma de las props sin avisar al resto del equipo
 * (mismo contrato de datos que ya se usa en el resto del proyecto).
 */

const mockProfile = {
  id: "usr_001",
  displayName: "Carlos Cartagena",
  avatarUrl: null, // string | null -> si es null se muestran las iniciales
  location: "San Salvador, El Salvador",
  memberSince: "2026",
  bio:
    "Ingeniero civil apasionado del outdoor. Alquilo equipo de camping y herramientas que uso solo un par de veces al año, para que otros aprovechen sin tener que comprar. Cada artículo se entrega limpio, revisado y con fotos del estado antes de salir del locker.",
  verifications: { identity: true, email: true, phone: true },
  stats: {
    itemsPublished: 14,
    rentalsCompleted: 87,
    responseTime: "~ 2 horas",
    rating: 4.9,
    reviewCount: 41,
  },
};

const mockItems = [
  { id: "itm_01", title: "Tienda de campaña 4 personas", category: "Camping", pricePerDay: 12 },
  { id: "itm_02", title: "Taladro inalámbrico DeWalt", category: "Herramientas", pricePerDay: 6 },
  { id: "itm_03", title: "Cámara Canon EOS R10", category: "Electrónica", pricePerDay: 20 },
  { id: "itm_04", title: "Bicicleta de montaña Trek", category: "Deportes", pricePerDay: 15 },
];

const mockReviews = [
  {
    id: "rev_01",
    author: "Alejandra C.",
    rating: 5,
    date: "Ago 2026",
    comment:
      "Todo salió perfecto. El equipo estaba impecable y la entrega en el locker fue súper rápida, no tuve que coordinar nada.",
  },
  {
    id: "rev_02",
    author: "Mario R.",
    rating: 5,
    date: "Jul 2026",
    comment:
      "Muy buena comunicación y el artículo llegó exactamente como en las fotos. Repetiría sin duda.",
  },
];

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

/** Marco tipo "compartimiento de locker" para el avatar — elemento de firma visual de Lendrop. */
function LockerAvatarFrame({ name, avatarUrl, verified, size = 128 }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-[28px] overflow-hidden border-2 border-[#A58CF4]/50 bg-gradient-to-br from-[#433075] to-[#A58CF4] shadow-[0_8px_24px_-8px_rgba(67,48,117,0.45)]">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-[#FAFAFA]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <span style={{ fontSize: size * 0.34, fontWeight: 700 }}>{initials(name)}</span>
          </div>
        )}
        {/* costura del "compartimiento" */}
        <div className="absolute left-0 right-0 top-[16%] h-px bg-[#0D0D0D]/15" />
        <div className="absolute left-1/2 -translate-x-1/2 top-[calc(16%-3px)] w-4 h-1.5 rounded-full bg-[#0D0D0D]/20" />
      </div>
      {verified && (
        <div
          className="absolute -bottom-1.5 -right-1.5 flex items-center justify-center w-9 h-9 rounded-2xl bg-[#433075] border-2 border-[#FAFAFA] shadow-md"
          title="Identidad verificada"
        >
          <ShieldCheck className="w-4 h-4 text-[#A58CF4]" strokeWidth={2.5} />
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#A58CF4] locker-led-pulse" />
        </div>
      )}
    </div>
  );
}

function VerificationChip({ label }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#433075]/[0.06] text-[#433075] text-xs font-medium px-3 py-1.5">
      <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2.5} />
      {label}
    </span>
  );
}

function StatBlock({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[#0D0D0D] text-xl" style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
        {value}
      </span>
      <span className="text-[#0D0D0D]/50 text-xs">{label}</span>
    </div>
  );
}

function ItemCard({ item }) {
  return (
    <div className="group rounded-2xl border border-[#0D0D0D]/[0.06] overflow-hidden hover:shadow-[0_12px_28px_-14px_rgba(13,13,13,0.25)] transition-shadow duration-300 bg-white">
      <div className="aspect-[4/3] bg-gradient-to-br from-[#433075]/10 to-[#A58CF4]/20 flex items-center justify-center">
        <Package className="w-8 h-8 text-[#433075]/40" strokeWidth={1.5} />
      </div>
      <div className="p-4">
        <span
          className="text-[10px] uppercase tracking-wider text-[#A58CF4]"
          style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}
        >
          {item.category}
        </span>
        <h3 className="text-[#0D0D0D] text-sm mt-1 leading-snug" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
          {item.title}
        </h3>
        <p className="mt-2 text-[#0D0D0D]/70 text-sm">
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>${item.pricePerDay}</span> / día
        </p>
      </div>
    </div>
  );
}

function ReviewCard({ review }) {
  return (
    <div className="py-5 border-b border-[#0D0D0D]/[0.06] last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#433075]/10 flex items-center justify-center text-[#433075] text-xs font-semibold">
          {initials(review.author)}
        </div>
        <div>
          <p className="text-sm font-medium text-[#0D0D0D]">{review.author}</p>
          <div className="flex items-center gap-1.5">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-3 h-3 ${i < review.rating ? "fill-[#0D0D0D] text-[#0D0D0D]" : "text-[#0D0D0D]/15"}`} />
              ))}
            </div>
            <span className="text-[#0D0D0D]/40 text-xs">{review.date}</span>
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm text-[#0D0D0D]/75 leading-relaxed">{review.comment}</p>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="py-14 flex flex-col items-center text-center gap-2">
      <Sparkles className="w-6 h-6 text-[#A58CF4]" strokeWidth={1.5} />
      <p className="text-sm text-[#0D0D0D]/50">{text}</p>
    </div>
  );
}

export default function LendropProfileView({
  profile = mockProfile,
  items = mockItems,
  reviews = mockReviews,
}) {
  const [activeTab, setActiveTab] = useState("items");
  const [bioExpanded, setBioExpanded] = useState(false);

  const bioIsLong = profile.bio.length > 180;
  const bioText = bioIsLong && !bioExpanded ? profile.bio.slice(0, 180) + "…" : profile.bio;

  const verificationLabels = [
    profile.verifications.identity && "Identidad verificada",
    profile.verifications.email && "Correo verificado",
    profile.verifications.phone && "Teléfono verificado",
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#FAFAFA]" style={{ fontFamily: "'Manrope', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .locker-led-pulse { animation: led-pulse 2.4s ease-in-out infinite; }
        @keyframes led-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(165,140,244,0.55); }
          50% { opacity: 0.65; box-shadow: 0 0 0 5px rgba(165,140,244,0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .locker-led-pulse { animation: none; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10 sm:py-14 pb-28 lg:pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Columna principal */}
          <div className="lg:col-span-2">
            <div className="flex items-start gap-5">
              <LockerAvatarFrame name={profile.displayName} avatarUrl={profile.avatarUrl} verified={profile.verifications.identity} />
              <div className="pt-1">
                <h1 className="text-[#0D0D0D] text-2xl sm:text-3xl" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
                  {profile.displayName}
                </h1>
                <div className="mt-1.5 flex items-center gap-1.5 text-[#0D0D0D]/55 text-sm">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{profile.location}</span>
                  <span className="text-[#0D0D0D]/25">·</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-xs">
                    MIEMBRO DESDE {profile.memberSince}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {verificationLabels.map((label) => (
                    <VerificationChip key={label} label={label} />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-[#0D0D0D]/[0.06]">
              <h2 className="text-[#0D0D0D] text-lg mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                Acerca de {profile.displayName.split(" ")[0]}
              </h2>
              <p className="text-[#0D0D0D]/70 text-sm leading-relaxed">{bioText}</p>
              {bioIsLong && (
                <button onClick={() => setBioExpanded((v) => !v)} className="mt-2 inline-flex items-center gap-1 text-[#433075] text-sm font-medium hover:underline">
                  {bioExpanded ? "Leer menos" : "Leer más"}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${bioExpanded ? "rotate-180" : ""}`} />
                </button>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-[#0D0D0D]/[0.06]">
              <div className="flex gap-6 border-b border-[#0D0D0D]/[0.06]">
                {[
                  { key: "items", label: `Artículos en alquiler (${items.length})` },
                  { key: "reviews", label: `Reseñas (${reviews.length})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.key ? "border-[#433075] text-[#0D0D0D]" : "border-transparent text-[#0D0D0D]/45 hover:text-[#0D0D0D]/70"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-6">
                {activeTab === "items" ? (
                  items.length ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {items.map((item) => (
                        <ItemCard key={item.id} item={item} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState text="Este usuario todavía no ha publicado artículos." />
                  )
                ) : reviews.length ? (
                  <div>
                    {reviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                ) : (
                  <EmptyState text="Todavía no hay reseñas." />
                )}
              </div>
            </div>
          </div>

          {/* Sidebar de confianza (desktop) */}
          <div className="hidden lg:block">
            <div className="sticky top-8 rounded-2xl border border-[#0D0D0D]/[0.07] bg-white p-6 shadow-[0_16px_40px_-24px_rgba(13,13,13,0.25)]">
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-[#0D0D0D] text-[#0D0D0D]" />
                <span className="text-[#0D0D0D] font-semibold text-sm">{profile.stats.rating}</span>
                <span className="text-[#0D0D0D]/45 text-sm">({profile.stats.reviewCount} reseñas)</span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-y-5">
                <StatBlock label="Artículos publicados" value={profile.stats.itemsPublished} />
                <StatBlock label="Alquileres completados" value={profile.stats.rentalsCompleted} />
                <StatBlock label="Tiempo de respuesta" value={profile.stats.responseTime} />
              </div>

              <button className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-[#433075] hover:bg-[#362761] text-white text-sm font-medium py-3 transition-colors">
                <MessageCircle className="w-4 h-4" />
                Contactar
              </button>

              <div className="mt-4 flex items-start gap-2 text-[#0D0D0D]/50 text-xs leading-relaxed">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#A58CF4]" />
                <span>Entrega y devolución a través de un locker inteligente, sin coordinar en persona.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra inferior (mobile) */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#0D0D0D]/[0.08] px-5 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-[#0D0D0D] text-[#0D0D0D]" />
            <span className="text-sm font-semibold text-[#0D0D0D]">{profile.stats.rating}</span>
            <span className="text-[#0D0D0D]/45 text-xs">({profile.stats.reviewCount})</span>
          </div>
          <span className="text-[#0D0D0D]/45 text-xs">{profile.stats.responseTime} de respuesta</span>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-[#433075] text-white text-sm font-medium px-5 py-2.5">
          <MessageCircle className="w-4 h-4" />
          Contactar
        </button>
      </div>
    </div>
  );
}