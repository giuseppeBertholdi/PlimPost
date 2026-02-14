"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { DEFAULT_FONT_TITLE, DEFAULT_FONT_TEXT } from "@/lib/fonts";

type SessionUser = {
  id: string;
  email?: string;
};

type OnboardingProfile = {
  business_name: string;
  business_description: string;
  business_differential: string;
  tone_tags: string[];
  target_audience: string;
  logo_url?: string;
  brand_color_primary?: string;
  brand_color_secondary?: string;
  brand_color_text?: string;
  brand_font?: string;
  brand_font_title?: string;
  brand_font_text?: string;
};

const TONE_OPTIONS = [
  "Profissional",
  "Amigável",
  "Divertido",
  "Inspirador",
  "Técnico",
  "Urgente",
  "Acolhedor",
];

const paletteOptions = [
  { name: "Vibrante", colors: ["#f97316", "#fb923c", "#0f172a"] },
  { name: "Azul", colors: ["#2563eb", "#60a5fa", "#0f172a"] },
  { name: "Roxo", colors: ["#7c3aed", "#a78bfa", "#111827"] },
  { name: "Verde", colors: ["#16a34a", "#86efac", "#052e16"] },
  { name: "Rosa", colors: ["#db2777", "#f9a8d4", "#111827"] },
  { name: "Neutro", colors: ["#111827", "#9ca3af", "#f3f4f6"] },
  { name: "Terra", colors: ["#a16207", "#f59e0b", "#3f1d0b"] },
  { name: "Citrus", colors: ["#f59e0b", "#fde68a", "#1f2937"] },
  { name: "Marinho", colors: ["#0f172a", "#38bdf8", "#e2e8f0"] },
  { name: "Pastel", colors: ["#fda4af", "#bfdbfe", "#1f2937"] },
  { name: "Açai", colors: ["#5b21b6", "#c4b5fd", "#0f172a"] },
  { name: "Minimal", colors: ["#111827", "#e5e7eb", "#ffffff"] },
  { name: "Moderno", colors: ["#0891b2", "#67e8f9", "#0f172a"] },
  { name: "Premium", colors: ["#111827", "#f5d0fe", "#4c1d95"] },
  { name: "Quente", colors: ["#ef4444", "#fca5a5", "#1f2937"] },
];

export default function MarcaPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingProfile | null>(null);
  const [isEditingBrand, setIsEditingBrand] = useState(false);
  const [editingBusinessName, setEditingBusinessName] = useState("");
  const [editingBusinessDescription, setEditingBusinessDescription] = useState("");
  const [editingBusinessDifferential, setEditingBusinessDifferential] = useState("");
  const [editingTargetAudience, setEditingTargetAudience] = useState("");
  const [editingToneTags, setEditingToneTags] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isSavingBrand, setIsSavingBrand] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [selectedPalette, setSelectedPalette] = useState(0);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [customPalette, setCustomPalette] = useState([
    "#f97316",
    "#fb923c",
    "#0f172a",
  ]);

  const selectedPaletteColors = selectedPalette < 0 
    ? customPalette 
    : paletteOptions[selectedPalette]?.colors ?? customPalette;

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!isMounted) return;

      const sessionUser = data.session?.user;
      if (!sessionUser) {
        router.replace("/");
        return;
      }

      const fullSelect = "user_id,onboarding_completed,business_name,business_description,business_differential,tone_tags,target_audience,logo_url,brand_color_primary,brand_color_secondary,brand_color_text,brand_font,brand_font_title,brand_font_text";
      const fallbackSelect = "user_id,onboarding_completed,business_name,business_description,business_differential,tone_tags,target_audience,logo_url,brand_color_primary,brand_color_secondary,brand_color_text,brand_font";

      const { data: dataFull, error: errorFull } = await supabase
        .from("onboarding_profiles")
        .select(fullSelect)
        .eq("user_id", sessionUser.id)
        .maybeSingle();

      if (!isMounted) return;

      let onboarding = dataFull;
      if (errorFull) {
        const { data: dataFallback, error: errorFallback } = await supabase
          .from("onboarding_profiles")
          .select(fallbackSelect)
          .eq("user_id", sessionUser.id)
          .maybeSingle();
        if (!isMounted) return;
        if (errorFallback) {
          console.error("Failed to load onboarding profile:", errorFallback.message);
          setIsLoading(false);
          return;
        }
        // Adicionar campos faltantes com valores padrão do brand_font
        if (dataFallback) {
          onboarding = {
            ...dataFallback,
            brand_font_title: dataFallback.brand_font,
            brand_font_text: dataFallback.brand_font,
          } as unknown as typeof dataFull;
        } else {
          onboarding = null;
        }
      }

      if (!onboarding?.onboarding_completed) {
        router.replace("/onboarding");
        setIsLoading(false);
        return;
      }

      if (onboarding) {
        const o = onboarding as Record<string, unknown>;
        setOnboarding({
          business_name: onboarding.business_name,
          business_description: onboarding.business_description,
          business_differential: onboarding.business_differential,
          tone_tags: onboarding.tone_tags ?? [],
          target_audience: onboarding.target_audience,
          logo_url: onboarding.logo_url ?? undefined,
          brand_color_primary: onboarding.brand_color_primary ?? undefined,
          brand_color_secondary: onboarding.brand_color_secondary ?? undefined,
          brand_color_text: onboarding.brand_color_text ?? undefined,
          brand_font: onboarding.brand_font ?? undefined,
          brand_font_title: (o.brand_font_title as string | undefined) ?? undefined,
          brand_font_text: (o.brand_font_text as string | undefined) ?? undefined,
        });
        setEditingBusinessName(onboarding.business_name);
        setEditingBusinessDescription(onboarding.business_description);
        setEditingBusinessDifferential(onboarding.business_differential);
        setEditingTargetAudience(onboarding.target_audience);
        setEditingToneTags(onboarding.tone_tags ?? []);
        setLogoUrl(onboarding.logo_url);

        if (onboarding.brand_color_primary && onboarding.brand_color_secondary && onboarding.brand_color_text) {
          setCustomPalette([
            onboarding.brand_color_primary,
            onboarding.brand_color_secondary,
            onboarding.brand_color_text,
          ]);
          setSelectedPalette(-1);
        }
      }

      setUser({ id: sessionUser.id, email: sessionUser.email });
      setIsLoading(false);
    };

    loadSession();

    // Timeout de segurança para evitar travamento infinito
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        console.warn("Loading timeout - forcing setIsLoading(false)");
        setIsLoading(false);
      }
    }, 10000); // 10 segundos

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const toggleEditingTone = (tone: string) => {
    setEditingToneTags((prev) => {
      if (prev.includes(tone)) {
        return prev.filter((item) => item !== tone);
      }
      if (prev.length >= 2) return prev;
      return [...prev, tone];
    });
  };

  const handleUploadLogo = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error('Error uploading logo:', uploadError);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      setLogoUrl(publicUrl);
      
      const { error: updateError } = await supabase
        .from("onboarding_profiles")
        .update({ logo_url: publicUrl })
        .eq("user_id", user.id);

      if (updateError) {
        console.error('Error updating logo:', updateError);
      } else {
        setOnboarding(prev => prev ? { ...prev, logo_url: publicUrl } : null);
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!user || !logoUrl) return;

    setIsUploadingLogo(true);
    try {
      const { error } = await supabase
        .from("onboarding_profiles")
        .update({ logo_url: null })
        .eq("user_id", user.id);

      if (error) {
        console.error("Error removing logo:", error);
        return;
      }

      setLogoUrl(null);
      setOnboarding((prev) => (prev ? { ...prev, logo_url: undefined } : null));
    } catch (error) {
      console.error("Error removing logo:", error);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSaveBrand = async () => {
    if (!user) return;

    setIsSavingBrand(true);
    try {
      const updateDataFull = {
        business_name: editingBusinessName.trim(),
        business_description: editingBusinessDescription.trim(),
        business_differential: editingBusinessDifferential.trim(),
        target_audience: editingTargetAudience.trim(),
        tone_tags: editingToneTags,
        brand_color_primary: selectedPaletteColors[0],
        brand_color_secondary: selectedPaletteColors[1],
        brand_color_text: selectedPaletteColors[2],
        brand_font: DEFAULT_FONT_TITLE,
        brand_font_title: DEFAULT_FONT_TITLE,
        brand_font_text: DEFAULT_FONT_TEXT,
        updated_at: new Date().toISOString(),
      };

      let updateData: typeof updateDataFull | (Omit<typeof updateDataFull, 'brand_font_title' | 'brand_font_text'> & { brand_font: string }) = updateDataFull;
      let { error } = await supabase
        .from("onboarding_profiles")
        .update(updateDataFull)
        .eq("user_id", user.id);

      if (error && (error.message.includes("brand_font_title") || error.message.includes("brand_font_text") || error.message.includes("does not exist"))) {
        const { brand_font_title: _t, brand_font_text: _b, ...updateDataFallback } = updateDataFull;
        updateData = { ...updateDataFallback, brand_font: DEFAULT_FONT_TITLE } as typeof updateData;
        const res = await supabase.from("onboarding_profiles").update(updateData as any).eq("user_id", user.id);
        error = res.error;
      }

      if (error) {
        console.error("Error saving brand:", error);
        return;
      }

      const updatedOnboarding: OnboardingProfile = {
        business_name: updateData.business_name,
        business_description: updateData.business_description,
        business_differential: updateData.business_differential,
        target_audience: updateData.target_audience,
        tone_tags: updateData.tone_tags,
        logo_url: logoUrl ?? undefined,
        brand_color_primary: updateData.brand_color_primary,
        brand_color_secondary: updateData.brand_color_secondary,
        brand_color_text: updateData.brand_color_text,
        brand_font: updateData.brand_font,
        brand_font_title: (updateData as Record<string, unknown>).brand_font_title as string | undefined,
        brand_font_text: (updateData as Record<string, unknown>).brand_font_text as string | undefined,
      };

      setOnboarding(updatedOnboarding);
      setCustomPalette([
        updateData.brand_color_primary,
        updateData.brand_color_secondary,
        updateData.brand_color_text,
      ]);
      setSelectedPalette(-1);
      setIsEditingBrand(false);
    } catch (error) {
      console.error("Error saving brand:", error);
    } finally {
      setIsSavingBrand(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50/30">
        <div className="text-center">
          <div className="relative mx-auto mb-6 h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-orange-200"></div>
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-orange-500"></div>
          </div>
          <h2 className="font-display text-xl font-semibold text-zinc-900">Carregando...</h2>
          <p className="mt-2 text-sm text-zinc-600">Preparando sua área de trabalho</p>
        </div>
      </div>
    );
  }

  const displayName = user?.email?.split("@")[0] ?? "usuário";

  return (
    <div className="plimpost-dotted relative min-h-screen bg-zinc-50">
      <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl" />
      <div className="pointer-events-none absolute left-0 top-32 h-80 w-80 rounded-full bg-orange-100/50 blur-3xl" />
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6">
          <a
            href="/home"
            className="font-display text-base font-semibold text-zinc-900 sm:text-lg"
          >
            PlimPost
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/home"
              className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 sm:px-4 sm:py-2 sm:text-sm"
            >
              <span className="hidden sm:inline">Criar Post</span>
              <span className="sm:hidden">Criar</span>
            </a>
            <details className="relative sm:hidden">
              <summary className="list-none cursor-pointer rounded-full border border-zinc-200 bg-white px-2 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50">
                Menu
              </summary>
              <div className="absolute right-0 z-50 mt-3 w-48 rounded-2xl border border-zinc-200 bg-white p-2 text-sm text-zinc-700 shadow-lg">
                <a
                  href="/home"
                  className="block rounded-xl px-3 py-2 transition hover:bg-zinc-50"
                >
                  Criar Post
                </a>
                <a
                  href="/galeria"
                  className="block rounded-xl px-3 py-2 transition hover:bg-zinc-50"
                >
                  Galeria
                </a>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="block w-full rounded-xl px-3 py-2 text-left text-red-500 transition hover:bg-zinc-50"
                >
                  Sair
                </button>
              </div>
            </details>
            <a
              href="/galeria"
              className="hidden rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 sm:block sm:px-4 sm:py-2 sm:text-sm"
            >
              Galeria
            </a>
            <details className="relative hidden sm:block">
              <summary className="list-none cursor-pointer rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50">
                Perfil
              </summary>
              <div className="absolute right-0 z-50 mt-3 w-48 rounded-2xl border border-zinc-200 bg-white p-2 text-sm text-zinc-700 shadow-lg">
                <a
                  href="/onboarding"
                  className="block rounded-xl px-3 py-2 transition hover:bg-zinc-50"
                >
                  Minha marca
                </a>
                <button
                  type="button"
                  className="block w-full rounded-xl px-3 py-2 text-left transition hover:bg-zinc-50"
                >
                  Assinatura
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="block w-full rounded-xl px-3 py-2 text-left text-red-500 transition hover:bg-zinc-50"
                >
                  Sair
                </button>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-2xl font-semibold text-zinc-900 sm:text-3xl md:text-4xl">
            Minha Marca
          </h1>
          <p className="mt-2 text-xs text-zinc-600 sm:text-sm md:text-base">
            Gerencie as informações da sua marca
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900">Informações da Marca</h2>
            <button
              type="button"
              onClick={() => setIsEditingBrand(!isEditingBrand)}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50"
            >
              {isEditingBrand ? "Cancelar" : "Editar"}
            </button>
          </div>

          {!isEditingBrand ? (
            <div className="space-y-6">
              {/* Logo */}
              <div>
                <p className="mb-3 text-sm font-semibold text-zinc-700">Logo</p>
                {logoUrl ? (
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                      <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      disabled={isUploadingLogo}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      {isUploadingLogo ? "Removendo..." : "Remover logo"}
                    </button>
                  </div>
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-400">
                    Sem logo
                  </div>
                )}
              </div>

              {/* Informações */}
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-semibold text-zinc-500">Nome do negócio</p>
                  <p className="text-base text-zinc-900">{onboarding?.business_name}</p>
                </div>
                <div>
                  <p className="mb-2 text-sm font-semibold text-zinc-500">Público ideal</p>
                  <p className="text-base text-zinc-900">{onboarding?.target_audience}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="mb-2 text-sm font-semibold text-zinc-500">Descrição</p>
                  <p className="text-base text-zinc-700">{onboarding?.business_description}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="mb-2 text-sm font-semibold text-zinc-500">Diferencial</p>
                  <p className="text-base text-zinc-700">{onboarding?.business_differential}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="mb-2 text-sm font-semibold text-zinc-500">Tom de voz</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {onboarding?.tone_tags.map((tone) => (
                      <span key={tone} className="rounded-full bg-orange-50 px-3 py-1 text-sm text-orange-700">
                        {tone}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <p className="mb-2 text-sm font-semibold text-zinc-500">Identidade Visual</p>
                  <div className="mt-2 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-zinc-600">Cores:</span>
                      {onboarding?.brand_color_primary && (
                        <>
                          <span
                            className="h-8 w-8 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: onboarding.brand_color_primary }}
                          />
                          <span
                            className="h-8 w-8 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: onboarding.brand_color_secondary }}
                          />
                          <span
                            className="h-8 w-8 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: onboarding.brand_color_text }}
                          />
                        </>
                      )}
                    </div>
                    {(onboarding?.brand_font_title || onboarding?.brand_font_text || onboarding?.brand_font) && (
                      <div className="space-y-2">
                        <span className="text-sm text-zinc-600">Fontes: </span>
                        <div className="rounded-lg border border-zinc-200 bg-white p-3 space-y-2">
                          <p className="text-xs text-zinc-500">Título</p>
                          <p
                            className="text-base font-semibold text-zinc-900"
                            style={{ fontFamily: onboarding.brand_font_title || onboarding.brand_font }}
                          >
                            {onboarding.business_name}
                          </p>
                          <p className="text-xs text-zinc-500 mt-2">Texto</p>
                          <p
                            className="text-sm text-zinc-700"
                            style={{ fontFamily: onboarding.brand_font_text || onboarding.brand_font }}
                          >
                            Preview do corpo do post
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Upload Logo */}
              <div>
                <label className="mb-3 block text-sm font-semibold text-zinc-700">Logo</label>
                {logoUrl && (
                  <div className="mb-3 flex flex-col items-start gap-2">
                    <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                      <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <label className="flex cursor-pointer items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadLogo}
                          className="hidden"
                          disabled={isUploadingLogo}
                        />
                        {isUploadingLogo ? "Enviando..." : "Trocar logo"}
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        disabled={isUploadingLogo}
                        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                      >
                        Remover logo
                      </button>
                    </div>
                  </div>
                )}
                {!logoUrl && (
                  <label className="flex cursor-pointer items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadLogo}
                      className="hidden"
                      disabled={isUploadingLogo}
                    />
                    {isUploadingLogo ? "Enviando..." : "Adicionar logo"}
                  </label>
                )}
              </div>

              {/* Nome do Negócio */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700">Nome do negócio</label>
                <input
                  type="text"
                  value={editingBusinessName}
                  onChange={(e) => setEditingBusinessName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:border-orange-400 focus:outline-none"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700">Descrição</label>
                <textarea
                  value={editingBusinessDescription}
                  onChange={(e) => setEditingBusinessDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:border-orange-400 focus:outline-none"
                />
              </div>

              {/* Diferencial */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700">Diferencial</label>
                <textarea
                  value={editingBusinessDifferential}
                  onChange={(e) => setEditingBusinessDifferential(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:border-orange-400 focus:outline-none"
                />
              </div>

              {/* Público */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-700">Público ideal</label>
                <input
                  type="text"
                  value={editingTargetAudience}
                  onChange={(e) => setEditingTargetAudience(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:border-orange-400 focus:outline-none"
                />
              </div>

              {/* Tom de voz */}
              <div>
                <label className="mb-3 block text-sm font-semibold text-zinc-700">Tom de voz (máx. 2)</label>
                <div className="flex flex-wrap gap-2">
                  {TONE_OPTIONS.map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => toggleEditingTone(tone)}
                      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                        editingToneTags.includes(tone)
                          ? "border-orange-300 bg-orange-50 text-orange-700"
                          : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Identidade Visual */}
              <div className="space-y-6 rounded-xl border border-zinc-200 bg-zinc-50/50 p-6">
                <h3 className="text-sm font-semibold text-zinc-900">Identidade Visual</h3>
                
                {/* Paleta de Cores da Marca */}
                <div>
                  <label className="mb-3 block text-sm font-semibold text-zinc-700">Paleta de cores</label>
                  <button
                    type="button"
                    onClick={() => setIsPaletteOpen(true)}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50"
                  >
                    Selecionar cores
                  </button>
                  <div className="mt-3 flex items-center gap-3">
                    {selectedPaletteColors.map((color) => (
                      <span
                        key={color}
                        className="h-10 w-10 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

              </div>

              {/* Botão Salvar */}
              <button
                type="button"
                onClick={handleSaveBrand}
                disabled={isSavingBrand || !editingBusinessName.trim() || !editingBusinessDescription.trim()}
                className="w-full rounded-lg bg-orange-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-50"
              >
                {isSavingBrand ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          )}
        </div>
      </main>

      {isPaletteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold text-zinc-900">
                  Selecione uma paleta
                </h3>
                <p className="mt-1 text-sm text-zinc-500">
                  Escolha um conjunto de cores ou crie a sua própria paleta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaletteOpen(false)}
                className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600"
              >
                Fechar
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {paletteOptions.map((palette, index) => (
                <button
                  key={palette.name}
                  type="button"
                  onClick={() => setSelectedPalette(index)}
                  className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                    selectedPalette === index
                      ? "border-orange-300 bg-orange-50 text-orange-700"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  <span>{palette.name}</span>
                  <span className="flex items-center gap-1">
                    {palette.colors.map((color) => (
                      <span
                        key={color}
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Crie a sua paleta
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {customPalette.map((color, index) => (
                  <label
                    key={`${color}-${index}`}
                    className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-600"
                  >
                    <input
                      type="color"
                      value={color}
                      onChange={(event) => {
                        const next = [...customPalette];
                        next[index] = event.target.value;
                        setCustomPalette(next);
                        setSelectedPalette(-1);
                      }}
                      className="h-6 w-6 cursor-pointer rounded-full border border-zinc-200"
                    />
                    {color.toUpperCase()}
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedPalette(-1);
                  setIsPaletteOpen(false);
                }}
                className="mt-4 rounded-full bg-orange-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-orange-600"
              >
                Usar esta paleta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
