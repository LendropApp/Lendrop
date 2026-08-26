import React, { useState, useMemo } from "react";
import {
  Camera,
  ShieldCheck,
  ScanFace,
  MapPin,
  Globe,
  Bell,
  Loader2,
  Check,
} from "lucide-react";

/**
 * LendropProfileEdit
 * ---------------------------------------------------------------------
 * Plantilla de CREACIÓN / EDICIÓN DE PERFIL, con el sistema de marca de
 * Lendrop. Igual que LendropProfileView, es presentacional: el estado
 * vive aquí solo para que la plantilla sea interactiva al revisarla.
 *
 * Puntos de integración con Supabase (marcados con TODO en el código):
 *   - `initialProfile`     -> lectura desde `profiles` + `profile_private`
 *   - `handleAvatarChange` -> subir a Supabase Storage (bucket avatares)
 *     en vez de leer el archivo localmente con FileReader
 *   - `handleSubmit`       -> UPDATE en `profiles`
 *   - Sección "Verificación" -> conectar con el flujo real de
 *     verificación de identidad con IA (pendiente de definir)
 */

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
    <div className="rounded-2xl border border-[#0D0D0D]/[0.07] bg-white p-6 sm:p-7">
      <h2 className="text-[#0D0D0D] text-base" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
        {title}
      </h2>
      {description && <p className="mt-1 text-[#0D0D0D]/50 text-sm">{description}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Field({ label, htmlFor, children, hint }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-[#0D0D0D] mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-[#0D0D0D]/45">{hint}</p>}
    </div>
  );
}

const inputClasses =
  "w-full rounded-xl border border-[#0D0D0D]/[0.12] bg-[#FAFAFA] px-4 py-2.5 text-sm text-[#0D0D0D] placeholder:text-[#0D0D0D]/35 focus:outline-none focus:ring-2 focus:ring-[#A58CF4] focus:border-transparent transition-shadow";

function StatusChip({ status }) {
  const verified = status === "verified";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
        verified ? "bg-[#433075]/[0.08] text-[#433075]" : "bg-[#0D0D0D]/[0.06] text-[#0D0D0D]/55"
      }`}
    >
      {verified && <Check className="w-3 h-3" strokeWidth={3} />}
      {verified ? "Verificado" : "Pendiente"}
    </span>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-[#0D0D0D]">{label}</p>
        {description && <p className="text-xs text-[#0D0D0D]/45 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? "bg-[#433075]" : "bg-[#0D0D0D]/15"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
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

  const completeness = useMemo(() => {
    let score = 0;
    const total = 5;
    if (form.displayName?.trim()) score++;
    if (form.bio?.trim()) score++;
    if (avatarPreview) score++;
    if (form.verification.identity === "verified") score++;
    if (form.verification.face === "verified") score++;
    return Math.round((score / total) * 100);
  }, [form, avatarPreview]);

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
    <div className="min-h-screen bg-[#FAFAFA]" style={{ fontFamily: "'Manrope', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
      `}</style>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto px-5 sm:px-8 py-10 sm:py-14 pb-28">
        <div className="mb-8">
          <h1 className="text-[#0D0D0D] text-2xl" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
            Editar perfil
          </h1>
          <p className="mt-1 text-[#0D0D0D]/50 text-sm">Esta información se muestra en tu perfil público de Lendrop.</p>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex-1 h-1.5 rounded-full bg-[#0D0D0D]/[0.07] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#433075] to-[#A58CF4] transition-all duration-500"
                style={{ width: `${completeness}%` }}
              />
            </div>
            <span className="text-xs text-[#0D0D0D]/55 shrink-0" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {completeness}% COMPLETO
            </span>
          </div>
        </div>

        <div className="space-y-5">
          <SectionCard title="Foto de perfil" description="Una foto clara aumenta la confianza de otros usuarios.">
            <div className="flex items-center gap-5">
              <div className="relative w-24 h-24 shrink-0">
                <div className="absolute inset-0 rounded-[22px] overflow-hidden border-2 border-[#A58CF4]/50 bg-gradient-to-br from-[#433075] to-[#A58CF4] flex items-center justify-center">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#FAFAFA] text-2xl" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
                      {initials(form.displayName)}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <label
                  htmlFor="avatar-upload"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#0D0D0D]/[0.12] px-4 py-2 text-sm font-medium text-[#0D0D0D] hover:bg-[#0D0D0D]/[0.03] cursor-pointer transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Cambiar foto
                </label>
                <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                <p className="mt-1.5 text-xs text-[#0D0D0D]/40">JPG o PNG. Máx. 5 MB.</p>
              </div>
            </div>
          </SectionCard>

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
                  <MapPin className="w-4 h-4 text-[#0D0D0D]/35 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    id="location"
                    value={form.location}
                    onChange={(e) => update("location", e.target.value)}
                    className={`${inputClasses} pl-10 appearance-none`}
                  >
                    {LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Verificación de identidad" description="Los perfiles verificados generan más confianza y reciben más solicitudes de alquiler.">
            <div className="divide-y divide-[#0D0D0D]/[0.06]">
              <div className="flex items-center justify-between py-3 first:pt-0">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-[#433075]" />
                  <span className="text-sm text-[#0D0D0D]">Documento de identidad (DUI)</span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusChip status={form.verification.identity} />
                  {form.verification.identity !== "verified" && (
                    <button type="button" className="text-xs font-medium text-[#433075] hover:underline">
                      Subir documento
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between py-3 last:pb-0">
                <div className="flex items-center gap-3">
                  <ScanFace className="w-4 h-4 text-[#433075]" />
                  <span className="text-sm text-[#0D0D0D]">Verificación facial</span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusChip status={form.verification.face} />
                  {form.verification.face !== "verified" && (
                    <button type="button" className="text-xs font-medium text-[#433075] hover:underline">
                      Iniciar verificación
                    </button>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Preferencias">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Idioma" htmlFor="language">
                <div className="relative">
                  <Globe className="w-4 h-4 text-[#0D0D0D]/35 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    id="language"
                    value={form.language}
                    onChange={(e) => update("language", e.target.value)}
                    className={`${inputClasses} pl-10 appearance-none`}
                  >
                    <option value="es">Español</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </Field>
              <Field label="Moneda" htmlFor="currency" hint="Más monedas próximamente">
                <select
                  id="currency"
                  value={form.currency}
                  onChange={(e) => update("currency", e.target.value)}
                  className={`${inputClasses} appearance-none`}
                >
                  <option value="USD">USD — Dólar</option>
                </select>
              </Field>
            </div>
          </SectionCard>

          <SectionCard title="Notificaciones" description="Elige qué te queremos avisar por correo o push.">
            <div className="flex items-center gap-2 mb-1 text-[#0D0D0D]/40">
              <Bell className="w-3.5 h-3.5" />
              <span className="text-xs">Preferencias de aviso</span>
            </div>
            <div className="divide-y divide-[#0D0D0D]/[0.06]">
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
        </div>
      </form>

      {/* Barra de guardado */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-[#0D0D0D]/[0.08] px-5 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <span className="text-xs text-[#0D0D0D]/40">{savedAt ? "Cambios guardados" : "Cambios sin guardar"}</span>
          <div className="flex items-center gap-3">
            <button type="button" className="text-sm font-medium text-[#0D0D0D]/60 hover:text-[#0D0D0D] px-2">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#433075] hover:bg-[#362761] disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}