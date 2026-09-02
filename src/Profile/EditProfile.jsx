import React, { useState } from "react";
import {
  Camera,
  ShieldCheck,
  ScanFace,
  MapPin,
  Globe,
  Loader2,
} from "lucide-react";


const initialProfile = {
  displayName: "Carlos Cartagena",
  bio: "Ingeniero civil apasionado del outdoor. Alquilo equipo de camping y herramientas que uso solo un par de veces al año.",
  location: "San Salvador",
  avatarUrl: null,
  language: "es",
  currency: "USD",
  notifications: { reservations: true, messages: true, promos: false },
  verification: {
    identity: "verified", // "pending" | "verified"
    face: "pending",
  },
};

const LOCATIONS = ["San Salvador", "Santa Ana", "San Miguel", "La Libertad", "Soyapango", "Santa Tecla"];

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function SectionCard({ title, description, children }) {
  return (
    <div className="glass-effect card-hover rounded-2xl p-6 sm:p-8 border-l-4 border-[#A58CF4] shadow-lg">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="glow-text text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
            {title}
          </h2>
          {description && <p className="mt-2 text-white/50 text-sm">{description}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Field({ label, htmlFor, children, hint }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-bold text-[#A58CF4] mb-2">
        {label}
      </label>
      {children}
      {hint && <p className="mt-2 text-xs text-white/40">{hint}</p>}
    </div>
  );
}

const inputClasses =
  "w-full rounded-xl glass-effect px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#A58CF4] focus:border-[#A58CF4] transition-all border border-[#A58CF4]/20";

function StatusChip({ status }) {
  const verified = status === "verified";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold ${
        verified 
          ? "bg-gradient-to-r from-[#D4EDDA] to-[#C3E6CB] text-[#155724] border border-[#B1DFBB]" 
          : "bg-gradient-to-r from-[#FFF3CD] to-[#FFE69C] text-[#856404] border border-[#FFEAA7]"
      }`}
    >
      {verified ? "Verificado" : " Pendiente"}
    </span>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 px-3 rounded-lg hover:bg-[#F8F7FF] transition-colors">
      <div>
        <p className="text-sm font-bold text-[#1A0F3C]">{label}</p>
        {description && <p className="text-xs text-[#5D3B9F]/60 mt-1">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-12 h-7 rounded-full transition-all duration-300 ${
          checked 
            ? "bg-gradient-to-r from-[#7A57CC] to-[#A58CF4]" 
            : "bg-[#E8E0FF]"
        }`}
      >
        <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`} />
      </button>
    </div>
  );
}

export default function LendropProfileEdit({ profile = initialProfile, onSave }) {
  const [form, setForm] = useState(profile);
  const [avatarPreview, setAvatarPreview] = useState(profile.avatarUrl);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  const bioLimit = 280;

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSavedAt(null);
  }

  function updateNotification(key, value) {
    setForm((prev) => ({ ...prev, notifications: { ...prev.notifications, [key]: value } }));
    setSavedAt(null);
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    // TODO: subir `file` a Supabase Storage y guardar la URL pública real
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
    setSavedAt(null);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    // TODO: reemplazar por UPDATE real en Supabase (tabla `profiles`)
    setTimeout(() => {
      setSaving(false);
      setSavedAt(new Date());
      onSave?.(form);
    }, 900);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F7FF] via-[#FFFFFF] to-[#F0E8FF]" style={{ fontFamily: "'Manrope', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        
        @keyframes bounce-in {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes glow-pulse {
          0%, 100% { text-shadow: 0 0 0px rgba(125, 55, 204, 0); }
          50% { text-shadow: 0 0 20px rgba(125, 55, 204, 0.4); }
        }
        
        .glass-effect {
          background: rgba(67,48,117,0.1);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(165,140,244,0.2);
        }
        
        .card-hover {
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .card-hover:hover {
          transform: translateY(-6px) scale(1.02);
          box-shadow: 0 20px 60px rgba(125, 55, 204, 0.2);
          border-color: rgba(165, 140, 244, 0.6);
        }
        
        .float-animation {
          animation: float 3s ease-in-out infinite;
        }
        
        .glow-text {
          background: linear-gradient(135deg, #5D3B9F, #7A57CC, #A58CF4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .bounce-animation {
          animation: bounce-in 0.6s ease-out;
        }
        
        .shimmer-gradient {
          background: linear-gradient(90deg, #5D3B9F, #A58CF4, #7A57CC, #5D3B9F);
          background-size: 200% 200%;
          animation: shimmer 3s ease-in-out infinite;
        }
      `}</style>

      {/* Header Futurista con Ondas y Creatividad */}
      <div className="relative w-full overflow-hidden">
        {/* Fondo gradiente animado */}
        <div className="absolute inset-0 shimmer-gradient opacity-40" />
        
        {/* Círculos decorativos flotantes */}
        <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-[#A58CF4]/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-10 w-40 h-40 rounded-full bg-[#7A57CC]/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <svg className="absolute top-0 left-0 w-full h-full opacity-40" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path fill="currentColor" fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,165.3C384,171,480,149,576,144C672,139,768,149,864,160C960,171,1056,181,1152,176C1248,171,1344,149,1392,138.7L1440,128L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z" className="text-[#A58CF4] opacity-30"></path>
        </svg>

        <div className="relative z-10 max-w-2xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
          <div className="flex items-center gap-6">
            {/* Avatar con Creatividad */}
            <div className="float-animation bounce-animation relative">
              <div className="relative w-32 h-32 shrink-0">
                {/* Anillo gradiente externo */}
                <div className="absolute -inset-2 rounded-3xl shimmer-gradient opacity-50 blur-lg" />
                
                {/* Avatar principal */}
                <div className="absolute inset-0 rounded-3xl overflow-hidden border-4 border-white bg-gradient-to-br from-[#F8F7FF] to-[#E8E0FF] flex items-center justify-center shadow-2xl">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#7A57CC] to-[#A58CF4] flex items-center justify-center">
                      <span className="text-white text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
                        {initials(form.displayName)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-white/70 font-bold">Selecciona una foto de perfil</p>
                <p className="text-xs text-white/40 mt-1">JPG o PNG. Máximo 5 MB.</p>
              </div>
              <label
                htmlFor="avatar-upload"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#7A57CC] to-[#A58CF4] hover:from-[#5D3B9F] hover:to-[#7A57CC] px-5 py-3 text-sm font-bold text-white cursor-pointer transition-all transform hover:scale-105 shadow-md"
              >
                <Camera className="w-5 h-5" />
                Subir
              </label>
              <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-5 sm:px-8 py-10 pb-32 space-y-6">
          <SectionCard title="Información básica">
            <div className="space-y-5">
              <Field label="Nombre para mostrar" htmlFor="displayName">
                <input
                  id="displayName"
                  type="text"
                  value={form.displayName}
                  onChange={(e) => update("displayName", e.target.value)}
                  className={inputClasses}
                  placeholder="Tu nombre completo"
                />
              </Field>

              <Field label="Biografía" htmlFor="bio" hint={`${form.bio.length}/${bioLimit} caracteres`}>
                <textarea
                  id="bio"
                  rows={4}
                  maxLength={bioLimit}
                  value={form.bio}
                  onChange={(e) => update("bio", e.target.value)}
                  className={`${inputClasses} resize-none`}
                  placeholder="Cuéntale a la comunidad quién eres y qué artículos ofreces"
                />
              </Field>

              <Field label="Ubicación" htmlFor="location">
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#A58CF4]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    id="location"
                    value={form.location}
                    onChange={(e) => update("location", e.target.value)}
                    className={`${inputClasses} pl-10 appearance-none`}
                  >
                    {LOCATIONS.map((loc) => (
                      <option key={loc} value={loc} className="bg-white text-[#1A0F3C]">
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Verificación de identidad" description="Los perfiles verificados generan más confianza y reciben más solicitudes de alquiler.">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-[#F5F0FF] to-[#FFFBF0] border-2 border-[#E8E0FF]">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#7A57CC]" />
                  <span className="text-sm text-[#1A0F3C] font-bold">Documento de identidad (DUI)</span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusChip status={form.verification.identity} />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-[#F5F0FF] to-[#FFFBF0] border-2 border-[#E8E0FF]">
                <div className="flex items-center gap-3">
                  <ScanFace className="w-5 h-5 text-[#7A57CC]" />
                  <span className="text-sm text-[#1A0F3C] font-bold">Verificación facial</span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusChip status={form.verification.face} />
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Preferencias">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Idioma" htmlFor="language">
                <div className="relative">
                  <Globe className="w-4 h-4 text-[#A58CF4]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    id="language"
                    value={form.language}
                    onChange={(e) => update("language", e.target.value)}
                    className={`${inputClasses} pl-10 appearance-none`}
                  >
                    <option value="es" className="bg-white text-[#1A0F3C]">Español</option>
                    <option value="en" className="bg-white text-[#1A0F3C]">English</option>
                  </select>
                </div>
              </Field>
              <Field label="Moneda" htmlFor="currency" hint="Más próximamente">
                <select
                  id="currency"
                  value={form.currency}
                  onChange={(e) => update("currency", e.target.value)}
                  className={`${inputClasses} appearance-none`}
                >
                  <option value="USD" className="bg-white text-[#1A0F3C]">USD — Dólar</option>
                </select>
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Notificaciones" description="Elige qué te queremos avisar por correo o push.">
            <div className="space-y-2">
              <Toggle
                checked={form.notifications.reservations}
                onChange={(v) => updateNotification("reservations", v)}
                label="Recordatorios de reservas"
                description="Confirmaciones, entregas y devoluciones"
              />
              <Toggle checked={form.notifications.messages} onChange={(v) => updateNotification("messages", v)} label="Mensajes de arrendatarios" />
              <Toggle checked={form.notifications.promos} onChange={(v) => updateNotification("promos", v)} label="Promociones y novedades" />
            </div>
          </SectionCard>
      </form>

      {/* Barra de guardado - Footer Creativo */}
      <div className="fixed bottom-0 inset-x-0 glass-effect border-t-2 border-[#A58CF4] px-5 py-5 backdrop-blur-xl shadow-2xl">
        <div className="max-w-2xl mx-auto">
          {/* Decoración Superior */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#7A57CC] to-[#A58CF4] animate-pulse"></div>
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#7A57CC] to-[#A58CF4] animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#7A57CC] to-[#A58CF4] animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-[#5D3B9F]/60">ESTADO</p>
              <p className="text-sm font-bold text-[#1A0F3C] mt-1">
                {savedAt ? "Guardado exitosamente" : "Cambios sin guardar"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                  type="button"
                  onClick={() => {
                    setForm(profile);
                    setAvatarPreview(profile.avatarUrl);
                    setSavedAt(null);
                  }}
                className="text-sm font-bold text-[#5D3B9F]/70 hover:text-[#5D3B9F] px-4 py-2.5 rounded-lg hover:bg-[#F0E8FF] transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg shimmer-gradient hover:shadow-lg disabled:opacity-60 text-white text-sm font-bold px-6 py-2.5 transition-all shadow-lg transform hover:scale-105"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>

          {/* Decoración Inferior */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#7A57CC] to-[#A58CF4] animate-pulse"></div>
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#7A57CC] to-[#A58CF4] animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#7A57CC] to-[#A58CF4] animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}