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

/** Marco tipo "compartimiento de locker" futurista */
function LockerAvatarFrame({ name, avatarUrl, verified, size = 128 }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-3xl overflow-hidden border-2 border-[#A58CF4]/50 bg-gradient-to-br from-[#433075]/50 to-[#5D3B9F]/30 shadow-[0_0_30px_rgba(165,140,244,0.3)]">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-white"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <span style={{ fontSize: size * 0.34, fontWeight: 700 }}>{initials(name)}</span>
          </div>
        )}
        {/* Linea futurista */}
        <div className="absolute left-0 right-0 top-1/3 h-px bg-gradient-to-r from-transparent via-[#A58CF4]/50 to-transparent" />
      </div>
      {verified && (
        <div
          className="absolute -bottom-2 -right-2 flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-[#433075] to-[#5D3B9F] border-2 border-white shadow-lg"
          title="Identidad verificada"
        >
          <ShieldCheck className="w-5 h-5 text-[#A58CF4]" strokeWidth={2.5} />
        </div>
      )}
    </div>
  );
}

function VerificationChip({ label }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg glass-effect px-3 py-1.5 text-[#A58CF4] text-xs font-bold border border-[#A58CF4]/20">
      <ShieldCheck className="w-3.5 h-3.5" strokeWidth={2.5} />
      {label}
    </span>
  );
}

function StatBlock({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[#A58CF4] text-xl font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {value}
      </span>
      <span className="text-white/50 text-xs">{label}</span>
    </div>
  );
}

function ItemCard({ item }) {
  return (
    <div className="glass-effect card-hover rounded-2xl overflow-hidden border border-[#A58CF4]/20">
      <div className="aspect-[4/3] bg-gradient-to-br from-[#433075]/30 to-[#A58CF4]/20 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-gradient-to-r from-transparent via-white to-transparent transform -skew-x-12" />
        <Package className="w-12 h-12 text-[#A58CF4]" strokeWidth={1.5} />
      </div>
      <div className="p-4">
        <span className="text-[10px] uppercase tracking-widest text-[#A58CF4] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          {item.category}
        </span>
        <h3 className="text-white text-sm mt-2 font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {item.title}
        </h3>
        <p className="mt-3 text-white/70 text-sm">
          <span className="text-[#A58CF4] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            ${item.pricePerDay}
          </span>
          <span className="text-white/50"> / día</span>
        </p>
      </div>
    </div>
  );
}

function ReviewCard({ review }) {
  return (
    <div className="glass-effect rounded-xl p-4 border border-[#A58CF4]/10">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#433075] to-[#A58CF4] flex items-center justify-center text-white text-xs font-bold shrink-0">
          {initials(review.author)}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="text-white font-bold text-sm">{review.author}</p>
            <span className="text-white/40 text-xs">{review.date}</span>
          </div>
          <div className="flex gap-1 mt-1 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`w-3 h-3 ${i < review.rating ? "fill-[#A58CF4] text-[#A58CF4]" : "text-white/20"}`} />
            ))}
          </div>
          <p className="text-white/70 text-sm leading-relaxed">{review.comment}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="py-12 flex flex-col items-center text-center gap-2">
      <Sparkles className="w-8 h-8 text-[#A58CF4] animate-pulse" strokeWidth={1.5} />
      <p className="text-sm text-white/50">{text}</p>
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
    <div className="min-h-screen bg-gradient-to-br from-[#0F0A1A] via-[#1A1230] to-[#0F0A1A]" style={{ fontFamily: "'Manrope', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        
        .locker-led-pulse { animation: led-pulse 2.4s ease-in-out infinite; }
        @keyframes led-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(165,140,244,0.55); }
          50% { opacity: 0.65; box-shadow: 0 0 0 5px rgba(165,140,244,0); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        
        @keyframes glow-pulse {
          0%, 100% { text-shadow: 0 0 20px rgba(165,140,244,0.4); }
          50% { text-shadow: 0 0 40px rgba(165,140,244,0.8); }
        }
        
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .glass-effect {
          background: rgba(67,48,117,0.1);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(165,140,244,0.2);
        }
        
        .card-hover {
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 50px rgba(165,140,244,0.25);
          border-color: rgba(165,140,244,0.5);
        }
        
        .float-animation {
          animation: float 3s ease-in-out infinite;
        }
        
        .glow-text {
          animation: glow-pulse 3s ease-in-out infinite;
        }
        
        @media (prefers-reduced-motion: reduce) {
          .locker-led-pulse, .float-animation, .glow-text { animation: none; }
        }
      `}</style>

      {/* Header Futurista con Onda */}
      <div className="relative w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#433075]/20 via-[#5D3B9F]/10 to-[#433075]/20" />
        <svg className="absolute top-0 left-0 w-full h-full opacity-30" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="currentColor" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,144C672,139,768,149,864,160C960,171,1056,181,1152,176C1248,171,1344,149,1392,138.7L1440,128L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z" className="text-[#A58CF4] opacity-20"></path>
        </svg>

        <div className="relative z-10 max-w-5xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
          <div className="flex items-start gap-6">
            {/* Avatar Futurista */}
            <div className="float-animation">
              <LockerAvatarFrame name={profile.displayName} avatarUrl={profile.avatarUrl} verified={profile.verifications.identity} />
            </div>

            {/* Info Principal */}
            <div className="flex-1 pt-2">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-white text-3xl sm:text-4xl glow-text" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
                  {profile.displayName}
                </h1>
                {profile.verifications.identity && (
                  <div className="px-3 py-1 rounded-full glass-effect">
                    <span className="text-[#A58CF4] text-xs font-bold">✓ VERIFICADO</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-white/70 text-sm mb-4">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-[#A58CF4]" />
                  {profile.location}
                </span>
                <span className="text-white/30">•</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className="text-xs text-[#A58CF4]">
                  DESDE {profile.memberSince}
                </span>
              </div>

              {/* Verificaciones como Tags */}
              <div className="flex flex-wrap gap-2">
                {verificationLabels.map((label) => (
                  <div key={label} className="px-3 py-1.5 rounded-lg glass-effect">
                    <span className="text-[#A58CF4] text-xs font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10 pb-28 lg:pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna Principal */}
          <div className="lg:col-span-2 space-y-8">
            {/* Sobre el Usuario */}
            <div className="glass-effect rounded-2xl p-6 sm:p-8">
              <h2 className="text-white text-lg mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                Acerca de {profile.displayName.split(" ")[0]}
              </h2>
              <p className="text-white/70 text-sm leading-relaxed">{bioText}</p>
              {bioIsLong && (
                <button 
                  onClick={() => setBioExpanded((v) => !v)} 
                  className="mt-4 inline-flex items-center gap-1 text-[#A58CF4] text-sm font-medium hover:text-white transition-colors"
                >
                  {bioExpanded ? "Leer menos" : "Leer más"}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${bioExpanded ? "rotate-180" : ""}`} />
                </button>
              )}
            </div>

            {/* Tabs Futuristas */}
            <div className="glass-effect rounded-2xl p-6 sm:p-8">
              <div className="flex gap-4 mb-6 border-b border-[#A58CF4]/10">
                {[
                  { key: "items", label: `Artículos (${items.length})` },
                  { key: "reviews", label: `Reseñas (${reviews.length})` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`pb-3 text-sm font-medium transition-all relative ${
                      activeTab === tab.key 
                        ? "text-[#A58CF4]" 
                        : "text-white/50 hover:text-white/70"
                    }`}
                  >
                    {tab.label}
                    {activeTab === tab.key && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#A58CF4] to-[#433075]" />
                    )}
                  </button>
                ))}
              </div>

              <div>
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
                  <div className="space-y-4">
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

          {/* Sidebar Futurista */}
          <div className="hidden lg:block">
            <div className="sticky top-8 space-y-4">
              {/* Card de Rating */}
              <div className="glass-effect card-hover rounded-2xl p-6 backdrop-blur-xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < Math.floor(profile.stats.rating) ? "fill-[#A58CF4] text-[#A58CF4]" : "text-white/20"}`} />
                    ))}
                  </div>
                  <span className="text-white font-bold">{profile.stats.rating}</span>
                </div>
                <p className="text-white/60 text-sm">Basado en {profile.stats.reviewCount} reseñas</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-effect card-hover rounded-xl p-4">
                  <p className="text-[#A58CF4] text-2xl font-bold">{profile.stats.itemsPublished}</p>
                  <p className="text-white/60 text-xs mt-1">Artículos</p>
                </div>
                <div className="glass-effect card-hover rounded-xl p-4">
                  <p className="text-[#A58CF4] text-2xl font-bold">{profile.stats.rentalsCompleted}</p>
                  <p className="text-white/60 text-xs mt-1">Alquileres</p>
                </div>
              </div>

              {/* Button Contactar Futurista */}
              <button className="w-full py-3 rounded-xl bg-gradient-to-r from-[#433075] to-[#5D3B9F] hover:from-[#5D3B9F] hover:to-[#7A57CC] text-white text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 group">
                <MessageCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Contactar
              </button>

              {/* Info Locker */}
              <div className="glass-effect rounded-xl p-4 border-l-2 border-[#A58CF4]">
                <p className="text-white/70 text-xs leading-relaxed flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#A58CF4] shrink-0 mt-0.5" />
                  Entrega en locker inteligente, sin coordinar en persona
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar Futurista */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 glass-effect border-t border-[#A58CF4]/10 px-5 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-[#A58CF4] text-[#A58CF4]" />
            <span className="text-white font-bold text-sm">{profile.stats.rating}</span>
          </div>
          <p className="text-white/50 text-xs mt-0.5">~ 2 horas de respuesta</p>
        </div>
        <button className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#433075] to-[#5D3B9F] text-white text-sm font-bold flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          Contactar
        </button>
      </div>
    </div>
  );
}