"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { DEFAULT_FONT_TITLE, DEFAULT_FONT_TEXT } from "@/lib/fonts";
import AdSidebar from "@/components/AdSidebar";

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

// Função auxiliar para fazer fetch com tratamento seguro de JSON
async function safeFetchJson(url: string, options?: RequestInit): Promise<any> {
  const response = await fetch(url, options);
  const contentType = response.headers.get("content-type");
  
  if (contentType && contentType.includes("application/json")) {
    return await response.json();
  } else {
    const text = await response.text();
    console.error("Resposta não é JSON:", text.substring(0, 200));
    throw new Error(
      response.status === 404
        ? "Rota da API não encontrada."
        : `Erro no servidor (${response.status}).`
    );
  }
}

export default function HomePage() {
  const router = useRouter();
  
  // Estados de autenticação e dados do usuário
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingProfile | null>(null);
  
  // Estados de geração de post
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Estado de créditos
  const [credits, setCredits] = useState<number | null>(null);
  
  // Estados do chat de modificação
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; timestamp: Date }>>([]);
  const [chatInput, setChatInput] = useState("");
  const [isModifying, setIsModifying] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Estados de paleta de cores
  // selectedPalette: índice da paleta selecionada (-1 = paleta personalizada)
  const [selectedPalette, setSelectedPalette] = useState(0);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [customPalette, setCustomPalette] = useState([
    "#f97316",
    "#fb923c",
    "#0f172a",
  ]);
  
  // Estados do formulário de post
  const [objective, setObjective] = useState("Promover um Produto/Serviço");
  const [customObjective, setCustomObjective] = useState("");
  const [isCustomObjective, setIsCustomObjective] = useState(false);
  const [mainTheme, setMainTheme] = useState("");
  const [extraInfo, setExtraInfo] = useState("");
  
  
  // Estados de opções avançadas
  const [additionalText, setAdditionalText] = useState("");
  const [imageStyle, setImageStyle] = useState("moderno");
  const [textStyle, setTextStyle] = useState("padrão");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  // Estado para imagem de inspiração
  const [inspirationImage, setInspirationImage] = useState<string | null>(null);
  const [inspirationImageFile, setInspirationImageFile] = useState<File | null>(null);
  
  // Refs para controle de geração e carregamento inicial
  const isGeneratingRef = useRef(false);
  const initialLoadCompleteRef = useRef(false);

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

  const selectedPaletteColors = useMemo(() => {
    if (selectedPalette < 0) return customPalette;
    return paletteOptions[selectedPalette]?.colors ?? customPalette;
  }, [selectedPalette, customPalette, paletteOptions]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (!isMounted) return;

        const sessionUser = sessionData.session?.user;
        if (!sessionUser) {
          router.replace("/");
          return;
        }

        setUser({ id: sessionUser.id, email: sessionUser.email });

        // Tentar com colunas novas (brand_font_title, brand_font_text); se falhar (ex.: migração não aplicada), usar só colunas antigas
        let onboardingData: Record<string, unknown> | null = null;
        const fullSelect = "user_id,onboarding_completed,business_name,business_description,business_differential,tone_tags,target_audience,logo_url,brand_color_primary,brand_color_secondary,brand_color_text,brand_font,brand_font_title,brand_font_text";
        const fallbackSelect = "user_id,onboarding_completed,business_name,business_description,business_differential,tone_tags,target_audience,logo_url,brand_color_primary,brand_color_secondary,brand_color_text,brand_font";

        const { data: dataFull, error: errorFull } = await supabase
          .from("onboarding_profiles")
          .select(fullSelect)
          .eq("user_id", sessionUser.id)
          .maybeSingle();

        if (!isMounted) return;

        if (errorFull) {
          const { data: dataFallback, error: errorFallback } = await supabase
            .from("onboarding_profiles")
            .select(fallbackSelect)
            .eq("user_id", sessionUser.id)
            .maybeSingle();
          if (!isMounted) return;
          if (errorFallback) {
            console.error("Failed to load onboarding:", errorFallback.message || errorFallback.code || errorFallback);
            setIsLoading(false);
            initialLoadCompleteRef.current = true;
            return;
          }
          onboardingData = dataFallback as Record<string, unknown>;
        } else {
          onboardingData = dataFull as Record<string, unknown>;
        }

        if (!onboardingData?.onboarding_completed) {
          router.replace("/onboarding");
          setIsLoading(false);
          initialLoadCompleteRef.current = true;
          return;
        }

        // Atualizar estado do onboarding
        const name = onboardingData.business_name as string;
        const desc = onboardingData.business_description as string;
        const diff = onboardingData.business_differential as string;
        const audience = onboardingData.target_audience as string;
        const tags = (onboardingData.tone_tags ?? []) as string[];
        setOnboarding({
          business_name: name,
          business_description: desc,
          business_differential: diff,
          tone_tags: tags,
          target_audience: audience,
          logo_url: (onboardingData.logo_url as string | undefined) ?? undefined,
          brand_color_primary: (onboardingData.brand_color_primary as string | undefined) ?? undefined,
          brand_color_secondary: (onboardingData.brand_color_secondary as string | undefined) ?? undefined,
          brand_color_text: (onboardingData.brand_color_text as string | undefined) ?? undefined,
          brand_font: (onboardingData.brand_font as string | undefined) ?? undefined,
          brand_font_title: (onboardingData.brand_font_title as string | undefined) ?? undefined,
          brand_font_text: (onboardingData.brand_font_text as string | undefined) ?? undefined,
        });

        // Atualizar paleta se houver cores salvas
        const c1 = onboardingData.brand_color_primary as string | undefined;
        const c2 = onboardingData.brand_color_secondary as string | undefined;
        const c3 = onboardingData.brand_color_text as string | undefined;
        if (c1 && c2 && c3) {
          setCustomPalette([c1, c2, c3]);
          setSelectedPalette(-1);
        }

        setIsLoading(false);
        initialLoadCompleteRef.current = true;
      } catch (err) {
        console.error("Error loading data:", err);
        if (isMounted) {
          setIsLoading(false);
          initialLoadCompleteRef.current = true;
        }
      }
    };

    loadData();

    // Listener para atualizar quando dados mudarem (após carregamento inicial)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted || isGeneratingRef.current) return;
        
        // Ignorar refresh de token e eventos durante carregamento inicial
        if (event === 'TOKEN_REFRESHED' || !initialLoadCompleteRef.current) return;

        if (!session) {
          router.replace("/");
          return;
        }

        // Recarregar dados quando necessário (colunas básicas para não falhar se migração de fontes não foi aplicada)
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          // Recarregar créditos
          try {
            const creditsResponse = await fetch(`/api/credits?userId=${session.user.id}`);
            if (creditsResponse.ok) {
              const creditsData = await creditsResponse.json();
              setCredits(creditsData.credits ?? 0);
            }
          } catch (err) {
            console.error("Erro ao recarregar créditos:", err);
          }

          const { data: onboardingData } = await supabase
            .from("onboarding_profiles")
            .select("user_id,onboarding_completed,business_name,business_description,business_differential,tone_tags,target_audience,logo_url,brand_color_primary,brand_color_secondary,brand_color_text,brand_font")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (!isMounted) return;

          if (onboardingData?.onboarding_completed) {
            setOnboarding({
              business_name: onboardingData.business_name,
              business_description: onboardingData.business_description,
              business_differential: onboardingData.business_differential,
              tone_tags: onboardingData.tone_tags ?? [],
              target_audience: onboardingData.target_audience,
              logo_url: onboardingData.logo_url ?? undefined,
              brand_color_primary: onboardingData.brand_color_primary ?? undefined,
              brand_color_secondary: onboardingData.brand_color_secondary ?? undefined,
              brand_color_text: onboardingData.brand_color_text ?? undefined,
              brand_font: onboardingData.brand_font ?? undefined,
              brand_font_title: undefined,
              brand_font_text: undefined,
            });

            if (onboardingData.brand_color_primary && 
                onboardingData.brand_color_secondary && 
                onboardingData.brand_color_text) {
              setCustomPalette([
                onboardingData.brand_color_primary,
                onboardingData.brand_color_secondary,
                onboardingData.brand_color_text,
              ]);
              setSelectedPalette(-1);
            }
          }
        }
      }
    );

    // Timeout de segurança
    const timeoutId = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    }, 10000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  // Carregar créditos quando o usuário estiver disponível
  useEffect(() => {
    if (!user?.id) return;
    
    const loadCredits = async () => {
      try {
        const creditsResponse = await fetch(`/api/credits?userId=${user.id}`);
        if (creditsResponse.ok) {
          const creditsData = await creditsResponse.json();
          setCredits(creditsData.credits ?? 0);
        }
      } catch (err) {
        console.error("Erro ao carregar créditos:", err);
      }
    };

    loadCredits();
  }, [user?.id]);

  // Scroll automático do chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleModifyPost = async (message: string) => {
    if (!message.trim() || !user?.id || !onboarding || !generatedPost || !generatedImage) {
      return;
    }

    if (isModifying) return;

    setIsModifying(true);
    setErrorMessage(null);

    // Adicionar mensagem do usuário
    const userMessage = {
      role: 'user' as const,
      content: message,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");

    try {
      const currentPalette = selectedPalette >= 0 
        ? paletteOptions[selectedPalette]
        : { name: 'Personalizada', colors: customPalette };

      const response = await safeFetchJson('/api/modify-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          originalPost: generatedPost,
          originalImage: generatedImage,
          modificationRequest: message,
          onboarding: {
            business_name: onboarding.business_name,
            business_description: onboarding.business_description,
            business_differential: onboarding.business_differential,
            tone_tags: onboarding.tone_tags,
            target_audience: onboarding.target_audience,
            logo_url: onboarding.logo_url,
            brand_color_primary: onboarding.brand_color_primary,
            brand_color_secondary: onboarding.brand_color_secondary,
            brand_color_text: onboarding.brand_color_text,
          },
          currentPalette: currentPalette,
          currentFontTitle: DEFAULT_FONT_TITLE,
          currentFontText: DEFAULT_FONT_TEXT,
          imageStyle: imageStyle,
          textStyle: textStyle,
        }),
      });

      if (!response.success) {
        throw new Error(response.error || 'Erro ao modificar o post');
      }

      // Atualizar post e imagem
      setGeneratedPost(response.post);
      setGeneratedImage(response.image);

      // Adicionar resposta da IA
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: '✅ Modificação aplicada com sucesso! O post foi atualizado. Você pode continuar pedindo mais alterações.',
        timestamp: new Date()
      }]);

      // Recarregar créditos
      try {
        const creditsResponse = await fetch(`/api/credits?userId=${user.id}`);
        if (creditsResponse.ok) {
          const creditsData = await creditsResponse.json();
          setCredits(creditsData.credits ?? 0);
        }
      } catch (err) {
        console.error("Erro ao recarregar créditos:", err);
      }
    } catch (error) {
      let errorMsg = 'Erro ao modificar o post.';
      
      if (error instanceof Error) {
        errorMsg = error.message;
        
        // Verificar se é erro de créditos insuficientes
        if (error.message.includes('Créditos insuficientes') || error.message.includes('insufficientCredits')) {
          errorMsg = 'Créditos insuficientes. Você precisa de pelo menos 1 crédito para modificar o post.';
        }
      }

      setErrorMessage(errorMsg);
      
      // Adicionar mensagem de erro no chat
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ ${errorMsg}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsModifying(false);
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim() && !isModifying) {
      handleModifyPost(chatInput.trim());
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const handleGenerate = async () => {
    setErrorMessage(null);
    setGeneratedPost("");
    setGeneratedImage(null);
    setShowChat(false);
    setChatMessages([]);
    setChatInput("");

    // Verificar se está carregando antes de validar
    if (isLoading) {
      setErrorMessage("Aguarde, carregando dados...");
      return;
    }

    if (!onboarding) {
      setErrorMessage("Complete o onboarding para gerar um post.");
      return;
    }

    if (!user?.id) {
      setErrorMessage("Sessão expirada. Por favor, faça login novamente.");
      return;
    }

    if (!mainTheme.trim()) {
      setErrorMessage("Informe o tema central do post.");
      return;
    }

    const finalObjective =
      objective === "Outro" ? customObjective.trim() : objective;

    if (!finalObjective) {
      setErrorMessage("Descreva o objetivo do post.");
      return;
    }

    setIsGenerating(true);
    isGeneratingRef.current = true;

    // Garantir userId atual da sessão para salvar na galeria
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id ?? user?.id;

    // Converter imagem de inspiração para base64 se houver
    let inspirationImageBase64: string | undefined = undefined;
    if (inspirationImageFile) {
      try {
        const arrayBuffer = await inspirationImageFile.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );
        // Extrair o tipo MIME da imagem
        const mimeType = inspirationImageFile.type || "image/png";
        inspirationImageBase64 = `data:${mimeType};base64,${base64}`;
      } catch (error) {
        console.error("Erro ao converter imagem para base64:", error);
        setErrorMessage("Erro ao processar a imagem de inspiração.");
        setIsGenerating(false);
        isGeneratingRef.current = false;
        return;
      }
    }

    const payload = {
      onboarding,
      objective: finalObjective,
      mainTheme: mainTheme.trim(),
      extraInfo: extraInfo.trim(),
      palette: {
        name:
          selectedPalette < 0
            ? "Personalizada"
            : paletteOptions[selectedPalette]?.name ?? "Personalizada",
        colors: selectedPaletteColors,
      },
      fontTitle: DEFAULT_FONT_TITLE,
      fontText: DEFAULT_FONT_TEXT,
      additionalText: additionalText.trim() || undefined,
      imageStyle: imageStyle,
      textStyle: textStyle,
      userId: currentUserId,
      inspirationImage: inspirationImageBase64,
    };

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Tentar fazer parse da resposta como JSON
      let data: any;
      const contentType = response.headers.get("content-type");
      
      try {
        // Tentar fazer parse como JSON primeiro
        const text = await response.text();
        
        // Tentar fazer parse JSON mesmo se o content-type não indicar
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          // Se não for JSON válido, verificar se é erro do Netlify
          console.error("Resposta não é JSON válido:", text.substring(0, 200));
          
          // Verificar se é erro 502 do Netlify
          if (response.status === 502) {
            throw new Error(
              "O servidor está temporariamente indisponível. Isso geralmente acontece quando:\n" +
              "• A requisição demorou muito e foi interrompida\n" +
              "• Há problemas temporários com a API do Gemini\n" +
              "• O servidor está sobrecarregado\n\n" +
              "Por favor, tente novamente em alguns instantes. Se o problema persistir, tente:\n" +
              "• Remover a imagem de inspiração\n" +
              "• Reduzir informações adicionais\n" +
              "• Simplificar o tema do post"
            );
          }
          
          throw new Error(
            response.status === 404
              ? "Rota da API não encontrada. Verifique se o servidor está configurado corretamente."
              : `Erro no servidor (${response.status}). Tente novamente mais tarde.`
          );
        }
      } catch (textError) {
        // Se já foi lançado um erro acima, propagar
        if (textError instanceof Error && textError.message.includes("servidor")) {
          throw textError;
        }
        // Caso contrário, erro genérico
        throw new Error("Erro ao processar a resposta do servidor. Tente novamente.");
      }

      if (!response.ok) {
        // Verificar se é erro do Netlify (formato específico)
        if (data?.errorType === "Error" || data?.errorMessage) {
          const netlifyError = data.errorMessage || data.error || "Erro desconhecido no servidor";
          
          if (response.status === 502) {
            throw new Error(
              "O servidor encontrou um erro ao processar sua requisição. Isso pode ser causado por:\n" +
              "• Limite de tempo do servidor excedido\n" +
              "• Problemas temporários com a API do Gemini\n" +
              "• Sobrecarga do servidor\n\n" +
              "Por favor, tente novamente em alguns instantes. Se o problema persistir, tente simplificar sua solicitação."
            );
          }
          
          throw new Error(`Erro no servidor: ${netlifyError}`);
        }
        
        // Handle timeout errors (504 Gateway Timeout)
        if (response.status === 504 || data?.timeout) {
          const timeoutMessage = data?.error || 
            "A geração do post está demorando mais que o esperado. Isso pode acontecer quando há muitas requisições simultâneas ou quando a API do Gemini está lenta. Tente novamente em alguns instantes.";
          throw new Error(timeoutMessage);
        }
        // Handle bad gateway errors (502)
        if (response.status === 502 || data?.serverError || data?.networkError) {
          const serverErrorMessage = data?.error || 
            "O servidor está temporariamente indisponível ou houve um erro ao processar sua requisição. Isso pode ser causado por:\n" +
            "• Limite de tempo do servidor excedido\n" +
            "• Problemas temporários com a API do Gemini\n" +
            "• Sobrecarga do servidor\n\n" +
            "Por favor, tente novamente em alguns instantes. Se o problema persistir, tente simplificar sua solicitação (remover imagem de inspiração ou reduzir informações adicionais).";
          throw new Error(serverErrorMessage);
        }
        // Handle quota exceeded errors with retry information
        if (data?.quotaExceeded) {
          const retryInfo = data.retryAfter 
            ? ` Tente novamente em aproximadamente ${Math.ceil(data.retryAfter)} segundos.`
            : "";
          throw new Error(data.error + retryInfo);
        }
        // Handle insufficient credits
        if (data?.insufficientCredits || response.status === 402) {
          setErrorMessage(data.error || "Créditos insuficientes. Compre mais créditos para continuar gerando posts.");
          // Recarregar créditos
          if (user?.id) {
            try {
              const creditsResponse = await fetch(`/api/credits?userId=${user.id}`);
              if (creditsResponse.ok) {
                const creditsData = await creditsResponse.json();
                setCredits(creditsData.credits ?? 0);
              }
            } catch (err) {
              console.error("Erro ao recarregar créditos:", err);
            }
          }
          throw new Error(data.error || "Créditos insuficientes");
        }
        throw new Error(data?.error || "Erro ao gerar o post.");
      }

      setGeneratedPost(data.post ?? "");
      // Usar imageUrl se disponível (imagem salva), senão usar base64
      setGeneratedImage(data.imageUrl ?? data.image ?? null);
      
      // Inicializar chat com mensagem de boas-vindas
      setChatMessages([{
        role: 'assistant',
        content: 'Olá! Posso ajudar você a modificar este post. Você pode pedir mudanças como "mude a fonte", "altere as cores", "reescreva o texto", etc. Cada modificação consome 1 crédito. 😊',
        timestamp: new Date()
      }]);
      setShowChat(true);
      
      // Recarregar créditos após gerar post
      if (user?.id) {
        try {
          const creditsResponse = await fetch(`/api/credits?userId=${user.id}`);
          if (creditsResponse.ok) {
            const creditsData = await creditsResponse.json();
            setCredits(creditsData.credits ?? 0);
          }
        } catch (err) {
          console.error("Erro ao recarregar créditos:", err);
        }
      }
    } catch (error) {
      let message = "Erro ao gerar o post.";
      
      if (error instanceof Error) {
        // Se for um erro de parsing JSON, dar uma mensagem mais clara
        if (error.message.includes("JSON") || error.message.includes("Unexpected token")) {
          // Verificar se é um timeout do Netlify
          if (error.message.includes("Inactivity Timeout") || error.message.includes("504")) {
            message = "A geração do post demorou muito e foi interrompida. Isso pode acontecer quando a API está lenta. Tente novamente ou simplifique a solicitação (remova imagem de inspiração, use um tema mais simples).";
          } else {
            message = "Erro de comunicação com o servidor. Verifique se a API está configurada corretamente.";
          }
        } else if (error.message.includes("504") || error.message.includes("timeout") || error.message.includes("Timeout")) {
          message = "A geração do post demorou muito e foi interrompida. Isso pode acontecer quando a API está lenta. Tente novamente ou simplifique a solicitação (remova imagem de inspiração, use um tema mais simples).";
        } else {
          message = error.message;
        }
      }
      
      console.error("Erro ao gerar post:", error);
      setErrorMessage(message);
    } finally {
      setIsGenerating(false);
      isGeneratingRef.current = false;
    }
  };

  // Só renderizar quando dados estiverem carregados
  if (isLoading || !onboarding) {
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

  const displayName = onboarding.business_name || user?.email?.split("@")[0] || "usuário";

  return (
    <div className="plimpost-dotted relative min-h-screen bg-zinc-50">
      <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl" />
      <div className="pointer-events-none absolute left-0 top-32 h-80 w-80 rounded-full bg-orange-100/50 blur-3xl" />
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6">
          <a
            href="/home"
            className="flex items-center gap-2 font-display text-base font-semibold text-zinc-900 sm:text-lg"
          >
            <img 
              src="/icon.svg" 
              alt="PlimPost" 
              className="h-6 w-6 sm:h-7 sm:w-7"
            />
            PlimPost
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/creditos"
              className="flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-1.5 text-xs font-semibold text-orange-700 shadow-sm transition hover:bg-orange-100 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
            >
              <span>💎</span>
              <span className="hidden sm:inline">{credits ?? 0} {credits === 1 ? "crédito" : "créditos"}</span>
              <span className="sm:hidden">{credits ?? 0}</span>
            </a>
            <details className="relative sm:hidden">
              <summary className="list-none cursor-pointer rounded-full border border-zinc-200 bg-white px-2 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50">
                Menu
              </summary>
              <div className="absolute right-0 z-50 mt-3 w-48 rounded-2xl border border-zinc-200 bg-white p-2 text-sm text-zinc-700 shadow-lg">
                <a
                  href="/galeria"
                  className="block rounded-xl px-3 py-2 transition hover:bg-zinc-50"
                >
                  Galeria
                </a>
                <a
                  href="/marca"
                  className="block rounded-xl px-3 py-2 transition hover:bg-zinc-50"
                >
                  Minha Marca
                </a>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSignOut();
                  }}
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
            <a
              href="/marca"
              className="hidden rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 sm:block sm:px-4 sm:py-2 sm:text-sm"
            >
              Minha Marca
            </a>
            <details className="relative hidden sm:block">
            <summary className="list-none cursor-pointer rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50">
              Perfil
            </summary>
            <div className="absolute right-0 z-50 mt-3 w-48 rounded-2xl border border-zinc-200 bg-white p-2 text-sm text-zinc-700 shadow-lg">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSignOut();
                }}
                className="block w-full rounded-xl px-3 py-2 text-left text-red-500 transition hover:bg-zinc-50"
              >
                Sair
              </button>
            </div>
          </details>
          </div>
        </div>
      </header>

      <main className="relative w-full py-6 sm:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* Layout com anúncios laterais */}
          <div className="flex gap-4 lg:gap-6">
            {/* Anúncio lateral esquerdo */}
            <aside className="hidden lg:block">
              <AdSidebar />
            </aside>
            
            {/* Conteúdo Principal */}
            <div className="flex-1 min-w-0">
            <div className="mb-6 text-center sm:mb-8">
          <h1 className="font-display text-2xl font-semibold text-zinc-900 sm:text-3xl md:text-4xl">
            Olá, {displayName}! 👋
          </h1>
          <p className="mt-2 text-xs text-zinc-600 sm:text-sm md:text-base">
            Crie posts profissionais para suas redes sociais em segundos
          </p>
          
          {/* Banner de créditos destacado */}
          <div className="mt-6 mx-auto max-w-2xl">
            <a
              href="/creditos"
              className="group block rounded-2xl border-2 border-orange-300 bg-gradient-to-br from-orange-50 via-white to-orange-50/30 p-4 shadow-lg transition hover:border-orange-400 hover:shadow-xl sm:p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-2xl shadow-md sm:h-14 sm:w-14 sm:text-3xl">
                    💎
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-zinc-700 sm:text-base">
                      Você tem <span className="text-orange-600 font-bold">{credits ?? 0}</span> {credits === 1 ? "crédito" : "créditos"}
                    </p>
                    <p className="text-xs text-zinc-500 sm:text-sm">
                      {credits && credits > 0 ? "Continue gerando posts incríveis!" : "Compre créditos para começar a gerar posts"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-semibold text-orange-600 group-hover:text-orange-700 sm:text-sm">
                    Comprar →
                  </span>
                  <span className="text-xs text-zinc-400 sm:text-sm">
                    R$ 3,99
                  </span>
                </div>
              </div>
            </a>
          </div>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Card 1: Objetivo */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-sm font-bold text-orange-600">
                1
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900">Qual é o objetivo do post?</h3>
                <p className="text-xs text-zinc-500">Escolha o tipo de conteúdo que você quer criar</p>
              </div>
            </div>
            <div className="ml-0 flex flex-wrap gap-2 sm:ml-10">
              {[
                { label: "Promover um Produto/Serviço", icon: "🛍️" },
                { label: "Anunciar uma Novidade", icon: "🎉" },
                { label: "Engajar/Conectar", icon: "💬" },
                { label: "Educar/Dar uma Dica", icon: "💡" },
                { label: "Outro", icon: "✨" },
              ].map(({ label, icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (label === "Outro") {
                      setIsCustomObjective(true);
                      setObjective("Outro");
                    } else {
                      setIsCustomObjective(false);
                      setObjective(label);
                    }
                  }}
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                    objective === label
                      ? "border-orange-300 bg-orange-50 text-orange-700 shadow-sm"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-orange-200 hover:bg-orange-50/50"
                  }`}
                >
                  <span>{icon}</span>
                  <span>
                    {label === "Promover um Produto/Serviço" && "Promover"}
                    {label === "Anunciar uma Novidade" && "Anunciar"}
                    {label === "Engajar/Conectar" && "Engajar"}
                    {label === "Educar/Dar uma Dica" && "Educar"}
                    {label === "Outro" && "Outro"}
                  </span>
                </button>
              ))}
            </div>
            {isCustomObjective && (
              <div className="ml-10 mt-3">
                <input
                  type="text"
                  value={customObjective}
                  onChange={(event) => setCustomObjective(event.target.value)}
                  placeholder="Descreva o objetivo do post..."
                  className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-700 shadow-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>
            )}
          </div>

          {/* Card 2: Tema Central */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-sm font-bold text-orange-600">
                2
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900">Tema central do post</h3>
                <p className="text-xs text-zinc-500">Seja específico: descreva exatamente o que você quer comunicar no post</p>
              </div>
            </div>
            <div className="ml-0 sm:ml-10">
              <textarea
                value={mainTheme}
                onChange={(event) => setMainTheme(event.target.value)}
                placeholder="Exemplo detalhado: Lançamento do nosso novo hambúrguer de costela com barbecue artesanal. O hambúrguer tem 200g de carne, queijo cheddar, bacon crocante e molho especial. Disponível apenas este fim de semana com desconto de 20%."
                rows={4}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
              <div className="mt-2 space-y-1">
                <p className="text-xs text-zinc-500">
                  💡 <strong>Dica:</strong> Seja o mais específico possível! Inclua detalhes como: o que está sendo promovido, características principais, preços, promoções, prazos, etc.
                </p>
                {mainTheme.trim() && (
                  <p className="text-xs text-zinc-400">
                    {mainTheme.length} caracteres
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Informações Adicionais */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-sm font-bold text-zinc-500">
                3
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900">
                  Informações adicionais <span className="text-xs font-normal text-zinc-400">(opcional)</span>
                </h3>
                <p className="text-xs text-zinc-500">Preços, detalhes, promoções, fonte de preferência, etc.</p>
              </div>
            </div>
            <div className="ml-0 sm:ml-10">
              <textarea
                value={extraInfo}
                onChange={(event) => setExtraInfo(event.target.value)}
                placeholder="Ex: O hambúrguer custa R$ 39,90 e vem com fritas... Ou: Use a fonte Montserrat para o título"
                rows={2}
                className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
              />
              <p className="mt-2 text-xs text-zinc-500">
                💡 Dica: Você pode especificar a fonte de sua preferência aqui. Exemplo: "Use a fonte Montserrat para o título e Open Sans para o texto"
              </p>
            </div>
          </div>

          {/* Card 3.5: Imagem de Inspiração */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-sm font-bold text-orange-600">
                🎨
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900">
                  Imagem de inspiração <span className="text-xs font-normal text-zinc-400">(opcional)</span>
                </h3>
                <p className="text-xs text-zinc-500">Envie um post como exemplo para inspirar o design</p>
              </div>
            </div>
            <div className="ml-0 sm:ml-10">
              {!inspirationImage ? (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-6 transition hover:border-orange-400 hover:bg-orange-50/30">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setInspirationImageFile(file);
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setInspirationImage(event.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                  <svg className="mb-2 h-8 w-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-semibold text-zinc-600">Clique para fazer upload</span>
                  <span className="mt-1 text-xs text-zinc-400">PNG, JPG ou WEBP até 10MB</span>
                </label>
              ) : (
                <div className="relative">
                  <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                    <img
                      src={inspirationImage}
                      alt="Imagem de inspiração"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setInspirationImage(null);
                      setInspirationImageFile(null);
                    }}
                    className="mt-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50"
                  >
                    Remover imagem
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Card 3.5: Opções Avançadas */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-sm font-bold text-zinc-500">
                  ⚙️
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900">Opções avançadas</h3>
                  <p className="text-xs text-zinc-500">Personalize ainda mais seu post</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 shadow-sm transition hover:border-orange-200 hover:bg-orange-50"
              >
                {showAdvancedOptions ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            {showAdvancedOptions && (
              <div className="ml-10 space-y-4">
                {/* Texto Adicional */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">
                    Texto adicional para a imagem
                  </label>
                  <textarea
                    value={additionalText}
                    onChange={(event) => setAdditionalText(event.target.value)}
                    placeholder="Ex: Desconto de 20% válido até domingo..."
                    rows={2}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm transition focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                  />
                  <p className="mt-1 text-xs text-zinc-400">
                    Este texto aparecerá na imagem do post
                  </p>
                </div>

                {/* Estilo da Imagem */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">
                    Estilo visual da imagem
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "moderno", label: "Moderno", icon: "✨" },
                      { value: "minimalista", label: "Minimalista", icon: "🎯" },
                      { value: "colorido", label: "Colorido", icon: "🌈" },
                      { value: "elegante", label: "Elegante", icon: "💎" },
                      { value: "divertido", label: "Divertido", icon: "🎉" },
                      { value: "profissional", label: "Profissional", icon: "💼" },
                    ].map((style) => (
                      <button
                        key={style.value}
                        type="button"
                        onClick={() => setImageStyle(style.value)}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                          imageStyle === style.value
                            ? "border-orange-300 bg-orange-50 text-orange-700 shadow-sm"
                            : "border-zinc-200 bg-white text-zinc-600 hover:border-orange-200 hover:bg-orange-50/50"
                        }`}
                      >
                        <span>{style.icon}</span>
                        <span>{style.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Estilo do Texto */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">
                    Estilo do texto
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "padrão", label: "Padrão", icon: "📝" },
                      { value: "negrito", label: "Negrito", icon: "💪" },
                      { value: "itálico", label: "Itálico", icon: "✍️" },
                      { value: "maiúsculas", label: "Maiúsculas", icon: "🔤" },
                      { value: "destaque", label: "Destaque", icon: "⭐" },
                    ].map((style) => (
                      <button
                        key={style.value}
                        type="button"
                        onClick={() => setTextStyle(style.value)}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                          textStyle === style.value
                            ? "border-orange-300 bg-orange-50 text-orange-700 shadow-sm"
                            : "border-zinc-200 bg-white text-zinc-600 hover:border-orange-200 hover:bg-orange-50/50"
                        }`}
                      >
                        <span>{style.icon}</span>
                        <span>{style.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Paleta de Cores + Fontes */}
          <div className="rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-sm font-bold text-orange-600">
                🎨
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900">Paleta de cores e fontes</h3>
                <p className="text-xs text-zinc-500">Visual e tipografia do post</p>
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
              {/* Paleta - Visual Melhorado */}
              <div className="rounded-xl border-2 border-zinc-200 bg-white p-4 shadow-sm transition hover:border-orange-200 hover:shadow-md">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎨</span>
                    <span className="text-sm font-semibold text-zinc-700">Paleta de Cores</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPaletteOpen(true)}
                    className="rounded-lg border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-white px-3 py-1.5 text-xs font-semibold text-orange-700 shadow-sm transition hover:border-orange-300 hover:from-orange-100 hover:shadow-md"
                  >
                    Alterar
                  </button>
                </div>
                
                <div className="mb-3 rounded-lg border border-zinc-100 bg-gradient-to-br from-zinc-50 to-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      {selectedPalette < 0 ? "Paleta Personalizada" : paletteOptions[selectedPalette]?.name ?? "Personalizada"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedPaletteColors.map((color, index) => (
                      <label 
                        key={`${color}-${index}`} 
                        className="group relative cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div 
                          className="h-12 w-12 rounded-xl border-3 border-white shadow-lg transition hover:scale-110 hover:shadow-xl sm:h-14 sm:w-14"
                          style={{ 
                            backgroundColor: color,
                            borderColor: 'white',
                            boxShadow: `0 4px 12px ${color}40, 0 0 0 2px white`
                          }}
                        >
                          <input
                            type="color"
                            value={color}
                            onChange={(e) => {
                              e.stopPropagation();
                              // Se estiver usando uma paleta pré-definida, converter para personalizada ao editar
                              if (selectedPalette >= 0) {
                                const newPalette = [...selectedPaletteColors];
                                newPalette[index] = e.target.value;
                                setCustomPalette(newPalette);
                                setSelectedPalette(-1);
                              } else {
                                // Se já for personalizada, apenas atualizar
                                const newPalette = [...customPalette];
                                newPalette[index] = e.target.value;
                                setCustomPalette(newPalette);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                        </div>
                        <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-zinc-900 px-2 py-1 text-xs font-mono text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 pointer-events-none z-10">
                          {color.toUpperCase()}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <p className="text-xs text-zinc-500">
                  💡 Clique nas cores para personalizar ou "Alterar" para escolher uma paleta pronta
                </p>
              </div>
            </div>
          </div>

          {/* Botão de Gerar */}
          <div className="rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-4 sm:p-6">
            {errorMessage && !isLoading && (
              <div className="mb-4 rounded-xl border-2 border-red-300 bg-gradient-to-br from-red-50 to-white p-4 shadow-md">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 text-xl text-white">
                    ⚠
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800 sm:text-base">{errorMessage}</p>
                    {errorMessage.includes("Créditos insuficientes") && (
                      <a
                        href="/creditos"
                        className="mt-3 inline-block rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:from-orange-600 hover:to-orange-700 hover:shadow-xl"
                      >
                        💎 Comprar Créditos Agora
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !mainTheme.trim() || (objective === "Outro" && !customObjective.trim())}
              className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 text-sm font-bold text-white shadow-lg transition hover:from-orange-600 hover:to-orange-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-lg"
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Gerando seu post...
                </span>
              ) : (
                "✨ Gerar Post para Instagram"
              )}
            </button>
            {(!mainTheme.trim() || (objective === "Outro" && !customObjective.trim())) && (
              <p className="mt-2 text-center text-xs text-zinc-400">
                {!mainTheme.trim() && "⚠️ Preencha o tema central do post"}
                {!mainTheme.trim() && (objective === "Outro" && !customObjective.trim()) && " e "}
                {objective === "Outro" && !customObjective.trim() && "descreva o objetivo personalizado"}
              </p>
            )}
          </div>

          {/* Resultado Gerado */}
          {generatedImage && (
            <div className="mt-6 rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50/50 to-white p-6 shadow-lg">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-zinc-900">✨ Post gerado com sucesso!</h3>
                  <p className="text-xs text-zinc-500">Seu post está pronto para publicar no Instagram</p>
                </div>
              <button
                type="button"
                onClick={() => {
                  setGeneratedImage(null);
                  setGeneratedPost("");
                  setMainTheme("");
                  setExtraInfo("");
                  setAdditionalText("");
                  setInspirationImage(null);
                  setInspirationImageFile(null);
                  setShowChat(false);
                  setChatMessages([]);
                  setChatInput("");
                }}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50"
              >
                Limpar e gerar novo
              </button>
              </div>
              <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-2xl shadow-xl">
                <img
                  src={generatedImage}
                  alt="Post gerado para Instagram"
                  className="h-full w-full object-contain"
                />
              </div>
              {/* Legenda Gerada */}
              {generatedPost && (
                <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      📝 Legenda para Instagram
                    </label>
                    <button
                      type="button"
                      onClick={async (event) => {
                        try {
                          await navigator.clipboard.writeText(generatedPost);
                          // Feedback visual melhorado
                          const btn = event.currentTarget;
                          const originalText = btn.textContent;
                          btn.textContent = '✓ Copiado!';
                          btn.classList.add('bg-green-50', 'border-green-200', 'text-green-700');
                          setTimeout(() => {
                            btn.textContent = originalText;
                            btn.classList.remove('bg-green-50', 'border-green-200', 'text-green-700');
                          }, 2000);
                        } catch (err) {
                          alert('Erro ao copiar. Tente novamente.');
                        }
                      }}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50"
                    >
                      Copiar legenda
                    </button>
                  </div>
                  <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-3">
                    <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">
                      {generatedPost}
                    </p>
                  </div>
                </div>
              )}
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = generatedImage;
                    link.download = `post-instagram-${Date.now()}.png`;
                    link.click();
                  }}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  <span>💾</span>
                  Baixar imagem
                </button>
                <button
                  type="button"
                  onClick={async (event) => {
                    try {
                      await navigator.clipboard.writeText(generatedImage);
                      // Feedback visual melhorado
                      const btn = event.currentTarget;
                      const originalText = btn.innerHTML;
                      btn.innerHTML = '<span>✓</span> Copiado!';
                      btn.classList.add('bg-green-50', 'border-green-200', 'text-green-700');
                      setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.classList.remove('bg-green-50', 'border-green-200', 'text-green-700');
                      }, 2000);
                    } catch (err) {
                      alert('Erro ao copiar. Tente novamente.');
                    }
                  }}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  <span>📋</span>
                  Copiar link
                </button>
              </div>
              
              {/* Chat de Modificação */}
              <div className="mt-6 rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50/30 to-white">
                <div className="border-b border-orange-200 bg-white/50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-zinc-900">💬 Modificar Post com IA</h4>
                      <p className="text-xs text-zinc-500">Peça alterações e a IA modificará seu post. Cada modificação consome 1 crédito.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowChat(!showChat)}
                      className="rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-50"
                    >
                      {showChat ? 'Ocultar' : 'Abrir'} Chat
                    </button>
                  </div>
                </div>
                
                {showChat && (
                  <div className="flex flex-col" style={{ maxHeight: '500px' }}>
                    {/* Mensagens do Chat */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {chatMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                              msg.role === 'user'
                                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                                : 'bg-white border border-zinc-200 text-zinc-700'
                            }`}
                          >
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            <p className={`mt-1 text-xs ${msg.role === 'user' ? 'text-orange-100' : 'text-zinc-400'}`}>
                              {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                      {isModifying && (
                        <div className="flex justify-start">
                          <div className="rounded-2xl bg-white border border-zinc-200 px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <svg className="h-4 w-4 animate-spin text-orange-500" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span className="text-sm text-zinc-500">Processando modificação...</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    
                    {/* Input do Chat */}
                    <form onSubmit={handleChatSubmit} className="border-t border-orange-200 bg-white/50 p-4">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Ex: mude a fonte, altere as cores, reescreva o texto..."
                          disabled={isModifying}
                          className="flex-1 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200 disabled:bg-zinc-50 disabled:cursor-not-allowed"
                        />
                        <button
                          type="submit"
                          disabled={!chatInput.trim() || isModifying}
                          className="rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-orange-600 hover:to-orange-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-md"
                        >
                          {isModifying ? (
                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            'Enviar'
                          )}
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">
                        💡 Cada modificação consome 1 crédito. Você tem {credits !== null ? credits : 0} crédito{credits !== 1 ? 's' : ''} disponível{credits !== 1 ? 'is' : ''}.
                      </p>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
          </div>
            
            {/* Anúncio lateral direito */}
            <aside className="hidden lg:block">
              <AdSidebar />
            </aside>
          </div>
        </div>

      </main>

      {isPaletteOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 sm:px-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsPaletteOpen(false);
            }
          }}
        >
          <div 
            className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="font-display text-xl font-semibold text-zinc-900 sm:text-2xl">
                  Selecione uma paleta
                </h3>
                <p className="mt-2 text-sm text-zinc-500">
                  Escolha um conjunto de cores ou crie a sua própria paleta.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaletteOpen(false)}
                className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 hover:border-zinc-300"
              >
                ✕
              </button>
            </div>

            <div className="mb-6">
              <p className="mb-3 text-sm font-semibold text-zinc-700">Paletas pré-definidas</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {paletteOptions.map((palette, index) => (
                  <button
                    key={palette.name}
                    type="button"
                    onClick={() => {
                      setSelectedPalette(index);
                    }}
                    className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all ${
                      selectedPalette === index
                        ? "border-orange-400 bg-orange-50 text-orange-700 shadow-md scale-[1.02]"
                        : "border-zinc-200 bg-white text-zinc-600 hover:border-orange-300 hover:bg-orange-50/30 hover:shadow-sm"
                    }`}
                  >
                    <span className="font-medium">{palette.name}</span>
                    <span className="flex items-center gap-1.5">
                      {palette.colors.map((color) => (
                        <span
                          key={color}
                          className="h-4 w-4 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50/50 to-white p-5 sm:p-6">
              <p className="mb-4 text-sm font-semibold text-zinc-700">
                ✨ Crie a sua paleta personalizada
              </p>
              <div className="mb-4 flex flex-wrap gap-3">
                {customPalette.map((color, index) => (
                  <label
                    key={`${color}-${index}`}
                    className="group flex items-center gap-3 rounded-xl border-2 border-zinc-200 bg-white px-4 py-3 text-xs font-semibold text-zinc-600 transition hover:border-orange-300 hover:shadow-md cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="color"
                      value={color}
                      onChange={(event) => {
                        event.stopPropagation();
                        const next = [...customPalette];
                        next[index] = event.target.value;
                        setCustomPalette(next);
                        setSelectedPalette(-1);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-8 w-8 cursor-pointer rounded-lg border-2 border-zinc-200 shadow-sm transition hover:scale-110"
                    />
                    <span className="font-mono text-xs">{color.toUpperCase()}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPalette(-1);
                    setIsPaletteOpen(false);
                  }}
                  className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:from-orange-600 hover:to-orange-700 hover:shadow-xl"
                >
                  Usar paleta personalizada
                </button>
                <button
                  type="button"
                  onClick={() => setIsPaletteOpen(false)}
                  className="rounded-xl border-2 border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-50 hover:border-zinc-300"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-zinc-200 bg-white mt-12">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-base font-semibold text-zinc-900 sm:text-lg">PlimPost</div>
              <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
                Gerador de posts profissionais para redes sociais
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 sm:gap-4 sm:text-sm">
              <a href="/politica-privacidade" className="hover:text-zinc-600 transition">
                Política de Privacidade
              </a>
              <span className="text-zinc-300">•</span>
              <a href="/termos-uso" className="hover:text-zinc-600 transition">
                Termos de Uso
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
