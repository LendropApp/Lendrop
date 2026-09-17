import { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * Department -> City mapping for El Salvador.
 * Extend this list if you need more departments/municipalities.
 */
const CITIES_BY_DEPARTMENT = {
  "San Salvador": ["San Salvador", "Soyapango", "Mejicanos", "Apopa", "Ilopango"],
  "La Libertad": ["Santa Tecla", "Antiguo Cuscatlán", "Ciudad Merliot", "Colón", "Zaragoza", "Ciudad Arce", "Quezaltepeque"],
  "Santa Ana": ["Santa Ana", "Chalchuapa", "Metapán", "Coatepeque", "El Congo"],
  "San Miguel": ["San Miguel", "Chinameca", "Moncagua"],
  "La Unión": ["La Unión", "Conchagua", "Santa Rosa de Lima"],
  "Sonsonate": ["Sonsonate", "Acajutla", "Izalco", "Juayúa", "Nahuizalco", "Sonzacate", "Armenia"],
  "Ahuachapán": ["Ahuachapán", "Apaneca", "Atiquizaya", "Concepción de Ataco", "Jujutla", "San Francisco Menéndez", "San Lorenzo", "Tacuba"],
  "Cuscatlán": ["Cojutepeque", "Suchitoto", "San Pedro Perulapán", "San Rafael Cedros", "San Ramón", "Santa Cruz Michapa", "Tenancingo"],
  "Chalatenango": ["Chalatenango", "La Palma", "Nueva Concepción", "San Fernando", "San Francisco Lempa", "San Ignacio", "San Isidro Labrador", "San José Cancasque", "San José Las Flores", "San Luis del Carmen", "San Miguel de Mercedes", "San Rafael", "Santa Rita"],
  "Cabañas": ["Sensuntepeque", "Ilobasco", "Jutiapa", "San Isidro", "Tejutepeque"],
  "San Vicente": ["San Vicente", "Tecoluca", "Verapaz", "Apastepeque", "San Cayetano Istepeque"],
  "Usulután": ["Usulután", "Jiquilisco", "Puerto El Triunfo", "Jucuarán", "Santa Elena"],
  "Morazán": ["San Francisco Gotera", "Perquín"],
  "La Paz": ["Zacatecoluca", "Olocuilta", "San Luis Talpa", "San Juan Nonualco", "San Pedro Masahuat", "San Antonio Masahuat"],
};

const DEPARTMENTS = Object.keys(CITIES_BY_DEPARTMENT);

/**
 * "contact" step of HostOnboardingWizard.
 *
 * NOTE: host_onboarding has no `department` column — this uses the
 * existing `zone` column to store the selected department. Confirm with
 * backend that `zone` is meant for this before relying on it; if it's
 * meant for something else (e.g. a coverage/pricing zone), this needs a
 * new column or a different field name.
 *
 * Props:
 * - record: current host_onboarding row (to prefill values if the user
 *   already filled this step before)
 * - onNext: (patch) => void   -> HostOnboardingWizard calls goNext(patch)
 * - onBack: () => void
 */
export default function ContactCityStep({ record, onNext, onBack }) {
  const [form, setForm] = useState({
    // Strip a previously-saved "+503 " prefix so the input only shows
    // the local number next to the fixed prefix below.
    phone: (record?.phone || "").replace(/^\+503\s*/, ""),
    zone: record?.zone || "",
    city: record?.city || "",
  });
  const [errors, setErrors] = useState({});

  const handlePhoneChange = (e) => {
    // Keep only digits, cap at 8 (El Salvador local numbers), and
    // auto-insert the dash as the user types (e.g. 7123-4567).
    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    const formatted = digits.length > 4 ? `${digits.slice(0, 4)}-${digits.slice(4)}` : digits;
    setForm((prev) => ({ ...prev, phone: formatted }));
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
  };

  const handleDepartmentChange = (e) => {
    const zone = e.target.value;
    // Reset city whenever the department changes, since the previous
    // city may not belong to the new department.
    setForm((prev) => ({ ...prev, zone, city: "" }));
    setErrors((prev) => ({ ...prev, zone: undefined, city: undefined }));
  };

  const handleCityChange = (e) => {
    setForm((prev) => ({ ...prev, city: e.target.value }));
    if (errors.city) setErrors((prev) => ({ ...prev, city: undefined }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.phone.trim()) {
      newErrors.phone = "Enter a phone number.";
    } else if (!/^\d{4}-\d{4}$/.test(form.phone.trim())) {
      newErrors.phone = "Enter all 8 digits.";
    }
    if (!form.zone) newErrors.zone = "Select your department.";
    if (!form.city) newErrors.city = "Select your city.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) onNext({ ...form, phone: `+503 ${form.phone}` });
  };

  const availableCities = form.zone ? CITIES_BY_DEPARTMENT[form.zone] || [] : [];

  return (
    <div className="w-full max-w-md mx-auto px-6">
      <h1 className="font-display text-2xl sm:text-3xl text-deep-purple leading-snug mb-2">
        Tell us how to reach you
      </h1>
      <p className="text-jet-black/60 text-sm leading-relaxed mb-8">
        We use your phone number to confirm bookings and updates about your items.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-jet-black/70 mb-1.5">
            Phone number
          </label>
          <div
            className={`flex items-center rounded-xl border bg-white focus-within:ring-2 focus-within:ring-deep-purple ${
              errors.phone ? "border-red-400" : "border-lavender/40"
            }`}
          >
            <span className="pl-4 pr-2 py-3 text-base text-jet-black/50 border-r border-lavender/40 select-none">
              +503
            </span>
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={handlePhoneChange}
              autoComplete="tel"
              placeholder="0000-0000"
              className="flex-1 min-w-0 px-3 py-3 text-base text-jet-black placeholder:text-jet-black/40 bg-transparent focus:outline-none rounded-r-xl"
            />
          </div>
          {errors.phone && <p className="text-xs text-red-500 mt-1.5">{errors.phone}</p>}
        </div>

        <div>
          <label htmlFor="zone" className="block text-sm font-medium text-jet-black/70 mb-1.5">
            Department
          </label>
          <select
            id="zone"
            value={form.zone}
            onChange={handleDepartmentChange}
            className={`w-full rounded-xl border px-4 py-3 text-base text-jet-black bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple ${
              errors.zone ? "border-red-400" : "border-lavender/40"
            }`}
          >
            <option value="" disabled>Select your department</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {errors.zone && <p className="text-xs text-red-500 mt-1.5">{errors.zone}</p>}
        </div>

        <div>
          <label htmlFor="city" className="block text-sm font-medium text-jet-black/70 mb-1.5">
            City
          </label>
          <select
            id="city"
            value={form.city}
            onChange={handleCityChange}
            disabled={!form.zone}
            className={`w-full rounded-xl border px-4 py-3 text-base text-jet-black bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple disabled:bg-jet-black/5 disabled:text-jet-black/40 ${
              errors.city ? "border-red-400" : "border-lavender/40"
            }`}
          >
            <option value="" disabled>
              {form.zone ? "Select your city" : "Select a department first"}
            </option>
            {availableCities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {errors.city && <p className="text-xs text-red-500 mt-1.5">{errors.city}</p>}
        </div>

        <div className="flex items-center gap-3 pt-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-xl text-deep-purple font-medium text-base hover:bg-lavender/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            type="submit"
            className="flex-1 flex items-center justify-center gap-2 bg-linear-to-r from-deep-purple to-lavender text-white font-medium text-base py-3.5 rounded-xl shadow-[0_4px_20px_-4px_rgba(165,140,244,0.6)] transition hover:shadow-[0_4px_28px_-4px_rgba(165,140,244,0.75)] hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple focus-visible:ring-offset-2"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}