import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

const CIUDADES = [
  "San Salvador",
  "Santa Tecla",
  "Antiguo Cuscatlán",
  "San Miguel",
  "Santa Ana",
  "Soyapango",
  "Mejicanos",
  "Apopa",
];

/**
 * Paso "contact" del HostOnboardingWizard.
 * host_onboarding solo tiene columnas `phone` y `city` para este paso
 * (nombre y correo ya se piden en Signup, no se repiten aquí).
 *
 * Props:
 * - record: fila actual de host_onboarding (para precargar valores si el
 *   usuario ya había llenado este paso antes)
 * - onNext: (patch) => void   -> HostOnboardingWizard hace goNext(patch)
 * - onBack: () => void
 */
export default function ContactCityStep({ record, onNext, onBack }) {
  const [form, setForm] = useState({
    phone: record?.phone || "",
    city: record?.city || "",
  });
  const [errores, setErrores] = useState({});

  const handleChange = (campo) => (e) => {
    setForm((prev) => ({ ...prev, [campo]: e.target.value }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }));
  };

  const validar = () => {
    const nuevosErrores = {};
    if (!form.phone.trim()) {
      nuevosErrores.phone = "Ingresá un número de teléfono.";
    } else if (!/^\d{4}-?\d{4}$/.test(form.phone.trim())) {
      nuevosErrores.phone = "Usá el formato 0000-0000.";
    }
    if (!form.city) nuevosErrores.city = "Seleccioná tu ciudad.";
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validar()) onNext(form);
  };

  return (
    <div className="w-full max-w-md mx-auto px-6">
      <h1 className="font-display text-2xl sm:text-3xl text-deep-purple leading-snug mb-2">
        Contanos cómo contactarte
      </h1>
      <p className="text-gray-600 text-sm leading-relaxed mb-8">
        Usamos tu teléfono para confirmar reservas y avisos sobre tus artículos.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
            Teléfono
          </label>
          <input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={handleChange("phone")}
            autoComplete="tel"
            placeholder="0000-0000"
            className={`w-full rounded-xl border px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple ${
              errores.phone ? "border-red-400" : "border-lavender/40"
            }`}
          />
          {errores.phone && <p className="text-xs text-red-500 mt-1.5">{errores.phone}</p>}
        </div>

        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1.5">
            Ciudad
          </label>
          <select
            id="city"
            value={form.city}
            onChange={handleChange("city")}
            className={`w-full rounded-xl border px-4 py-3 text-base text-gray-900 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple ${
              errores.city ? "border-red-400" : "border-lavender/40"
            }`}
          >
            <option value="" disabled>Seleccioná tu ciudad</option>
            {CIUDADES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {errores.city && <p className="text-xs text-red-500 mt-1.5">{errores.city}</p>}
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-xl text-deep-purple font-medium text-base hover:bg-lavender/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender"
          >
            <ArrowLeft className="w-4 h-4" />
            Atrás
          </button>
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 bg-deep-purple hover:opacity-90 active:opacity-80 text-white font-medium text-base py-3.5 rounded-xl transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple focus-visible:ring-offset-2"
          >
            Continuar
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}