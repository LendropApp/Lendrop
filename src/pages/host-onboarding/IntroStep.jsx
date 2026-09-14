import { ArrowRight, Clock, ShieldCheck, Wallet } from "lucide-react";
 
/**
 * Paso "intro" del HostOnboardingWizard.
 * No necesita guardar nada en Supabase — solo avanza al siguiente paso.
 *
 * Props:
 * - onNext: () => void
 */
export default function IntroStep({ onNext }) {
  const puntos = [
    { icon: Clock, texto: "Toma menos de 5 minutos completar el registro." },
    { icon: Wallet, texto: "Vas a poder publicar tus artículos y empezar a recibir reservas." },
    { icon: ShieldCheck, texto: "Tus datos solo se usan para verificar tu cuenta como arrendador." },
  ];
 
  return (
    <div className="w-full max-w-md mx-auto px-6">
      <h1 className="font-display text-2xl sm:text-3xl text-deep-purple leading-snug mb-3">
        Convertite en arrendador de LENDROP
      </h1>
 
      <p className="text-gray-600 text-base leading-relaxed mb-8">
        Antes de publicar tus artículos, necesitamos algunos datos tuyos y de
        tu ubicación. Te lo pedimos en pasos cortos para que sea rápido.
      </p>
 
      <ul className="space-y-4 mb-10">
        {puntos.map(({ icon: Icon, texto }, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-lavender/20 flex items-center justify-center">
              <Icon className="w-4 h-4 text-deep-purple" strokeWidth={2} />
            </span>
            <span className="text-sm text-gray-700 leading-relaxed">{texto}</span>
          </li>
        ))}
      </ul>
 
      <button
        type="button"
        onClick={onNext}
        className="w-full flex items-center justify-center gap-2 bg-deep-purple hover:opacity-90 active:opacity-80 text-white font-medium text-base py-3.5 rounded-xl transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-deep-purple focus-visible:ring-offset-2"
      >
        Comenzar registro
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
 