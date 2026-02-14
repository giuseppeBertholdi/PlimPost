"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const TONE_OPTIONS = [
  "Profissional",
  "Amigável",
  "Divertido",
  "Inspirador",
  "Técnico",
  "Urgente",
  "Acolhedor",
];

export default function OnboardingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [businessDifferential, setBusinessDifferential] = useState("");
  const [toneTags, setToneTags] = useState<string[]>([]);
  const [targetAudience, setTargetAudience] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadSessionAndProfile = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;

      if (!data.session) {
        router.replace("/");
        return;
      }

      const { data: onboarding, error } = await supabase
        .from("onboarding_profiles")
        .select("onboarding_completed")
        .eq("user_id", data.session.user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        console.error("Failed to load onboarding profile:", error.message);
      }

      if (onboarding?.onboarding_completed) {
        router.replace("/home");
        return;
      }

      setIsLoading(false);
    };

    loadSessionAndProfile();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const progressLabel = useMemo(() => {
    if (step === 1) return "O básico do seu negócio";
    return "Tom de voz";
  }, [step]);

  const toggleTone = (tone: string) => {
    setToneTags((prev) => {
      if (prev.includes(tone)) {
        return prev.filter((item) => item !== tone);
      }
      if (prev.length >= 2) return prev;
      return [...prev, tone];
    });
  };

  const validateStep = () => {
    if (step === 1) {
      return (
        businessName.trim() &&
        businessDescription.trim() &&
        businessDifferential.trim()
      );
    }
    return toneTags.length > 0 && targetAudience.trim();
  };

  const handleNext = () => {
    if (!validateStep()) {
      setErrorMessage("Preencha todos os campos desta etapa.");
      return;
    }
    setErrorMessage(null);
    setStep((prev) => Math.min(prev + 1, 2));
  };

  const handleBack = () => {
    setErrorMessage(null);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep()) {
      setErrorMessage("Preencha todos os campos desta etapa.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const { data } = await supabase.auth.getSession();
    const sessionUser = data.session?.user;

    if (!sessionUser) {
      router.replace("/");
      return;
    }

    const { error } = await supabase.from("onboarding_profiles").upsert(
      {
        user_id: sessionUser.id,
        business_name: businessName.trim(),
        business_description: businessDescription.trim(),
        business_differential: businessDifferential.trim(),
        tone_tags: toneTags,
        target_audience: targetAudience.trim(),
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("Failed to save onboarding:", error.message);
      setErrorMessage("Não foi possível salvar o onboarding.");
      setIsSaving(false);
      return;
    }

    router.replace("/home");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-zinc-600">
        Carregando onboarding...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 px-6 py-10 md:py-16">
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] w-full max-w-6xl gap-10 md:grid-cols-[1fr_1.3fr] md:items-start">
        <div className="flex flex-col gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
              Etapa {step} de 2
            </p>
            <h1 className="font-display mt-2 text-4xl font-semibold text-zinc-900">
              {progressLabel}
            </h1>
            <p className="mt-3 text-base text-zinc-600">
              Vamos configurar sua marca para gerar posts consistentes, com o tom
              certo e identidade visual alinhada.
            </p>
          </div>

          <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
            <h2 className="font-display text-lg font-semibold text-zinc-900">
              O que vamos coletar
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-zinc-600">
              <li>Nome, descrição e diferencial do negócio.</li>
              <li>Tom de voz e público ideal para a IA.</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-orange-500">
              <span>Progresso</span>
              <span>{step}/2</span>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-orange-100">
              <div
                className="h-2 rounded-full bg-orange-500 transition-all"
                style={{ width: `${(step / 2) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-orange-100 bg-white p-8 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-500">
              {step === 1 && "Configuração inicial"}
              {step === 2 && "Personalidade da marca"}
            </div>
          </div>

          <div className="mt-6 grid gap-6">
          {step === 1 && (
            <>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-zinc-800">
                    Qual é o nome do seu negócio?
                  </label>
                  <button
                    type="button"
                    onClick={() => setBusinessName("Não sei")}
                    className="text-xs font-semibold text-orange-600 transition hover:text-orange-700"
                  >
                    Não sei
                  </button>
                </div>
                <input
                  type="text"
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  placeholder="Ex: Café Aurora"
                  className="mt-2 w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm focus:border-orange-300 focus:outline-none"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  Usamos isso para assinar os posts e criar identidade.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-zinc-800">
                    Descreva seu negócio em uma frase.
                  </label>
                  <button
                    type="button"
                    onClick={() => setBusinessDescription("Não sei")}
                    className="text-xs font-semibold text-orange-600 transition hover:text-orange-700"
                  >
                    Não sei
                  </button>
                </div>
                <textarea
                  value={businessDescription}
                  onChange={(event) => setBusinessDescription(event.target.value)}
                  placeholder="Somos uma cafeteria especializada em cafés especiais..."
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm focus:border-orange-300 focus:outline-none"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  Esta informação guia praticamente todas as gerações da IA.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-zinc-800">
                    Qual é o seu principal diferencial?
                  </label>
                  <button
                    type="button"
                    onClick={() => setBusinessDifferential("Não sei")}
                    className="text-xs font-semibold text-orange-600 transition hover:text-orange-700"
                  >
                    Não sei
                  </button>
                </div>
                <input
                  type="text"
                  value={businessDifferential}
                  onChange={(event) => setBusinessDifferential(event.target.value)}
                  placeholder="Ex: Atendimento 24h, ingredientes orgânicos..."
                  className="mt-2 w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm focus:border-orange-300 focus:outline-none"
                />
                <p className="mt-2 text-xs text-zinc-500">
                  Isso ajuda a criar posts mais persuasivos e únicos.
                </p>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="text-sm font-semibold text-zinc-800">
                  Como você quer que sua marca se comunique?
                </label>
                <p className="mt-2 text-xs text-zinc-500">
                  Escolha até dois tons.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {TONE_OPTIONS.map((tone) => {
                    const selected = toneTags.includes(tone);
                    return (
                      <button
                        key={tone}
                        type="button"
                        onClick={() => toggleTone(tone)}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          selected
                            ? "border-orange-500 bg-orange-500 text-white"
                            : "border-orange-200 bg-white text-orange-700 hover:bg-orange-50"
                        }`}
                      >
                        {tone}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-zinc-800">
                    Quem é o seu cliente ideal?
                  </label>
                  <button
                    type="button"
                    onClick={() => setTargetAudience("Não sei")}
                    className="text-xs font-semibold text-orange-600 transition hover:text-orange-700"
                  >
                    Não sei
                  </button>
                </div>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(event) => setTargetAudience(event.target.value)}
                  placeholder="Ex: Jovens universitários, gerentes de indústria..."
                  className="mt-2 w-full rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm focus:border-orange-300 focus:outline-none"
                />
              </div>
            </>
          )}
          </div>

          {errorMessage && (
            <p className="mt-6 text-sm font-semibold text-red-500">
              {errorMessage}
            </p>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={handleBack}
              className="rounded-full border border-orange-200 px-5 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-50 disabled:opacity-50"
              disabled={step === 1 || isSaving}
            >
              Voltar
            </button>

          {step < 2 ? (
              <button
                type="button"
                onClick={handleNext}
                className="rounded-full bg-orange-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
                disabled={isSaving}
              >
                Continuar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-full bg-orange-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
                disabled={isSaving}
              >
                {isSaving ? "Salvando..." : "Finalizar onboarding"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
