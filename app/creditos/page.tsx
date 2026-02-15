"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type SessionUser = {
  id: string;
  email?: string;
};

function CreditosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData.session?.user;

        if (!sessionUser) {
          router.replace("/");
          return;
        }

        setUser({ id: sessionUser.id, email: sessionUser.email });

        // Carregar créditos
        const response = await fetch(`/api/credits?userId=${sessionUser.id}`);
        if (response.ok) {
          const data = await response.json();
          setCredits(data.credits ?? 0);
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Verificar se veio do Stripe
    const success = searchParams.get("success");
    const sessionId = searchParams.get("session_id");
    const canceled = searchParams.get("canceled");

    if (success && sessionId) {
      // Processar pagamento manualmente se o webhook não foi chamado
      const processPayment = async () => {
        try {
          const response = await fetch("/api/process-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });

          const data = await response.json();
          
          if (response.ok) {
            console.log("Pagamento processado:", data);
            // Recarregar créditos após processar
            setTimeout(() => {
              loadData();
            }, 1000);
          } else {
            console.error("Erro ao processar pagamento:", data);
            // Mesmo assim, tentar recarregar créditos (pode ter sido processado pelo webhook)
            setTimeout(() => {
              loadData();
            }, 2000);
          }
        } catch (error) {
          console.error("Erro ao processar pagamento:", error);
          // Mesmo assim, tentar recarregar créditos
          setTimeout(() => {
            loadData();
          }, 2000);
        }
      };

      // Aguardar um pouco antes de processar (dar tempo para o webhook se houver)
      setTimeout(processPayment, 3000);
    }
  }, [router, searchParams]);

  const handlePurchase = async (packageType: "1" | "20") => {
    if (!user?.id) {
      setErrorMessage("Usuário não identificado.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          packageType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar sessão de checkout");
      }

      // Redirecionar para o Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("URL de checkout não retornada");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao processar compra.";
      setErrorMessage(message);
      setIsProcessing(false);
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
        </div>
      </div>
    );
  }

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

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
          <a
            href="/home"
            className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 sm:px-4 sm:py-2 sm:text-sm"
          >
            Voltar
          </a>
        </div>
      </header>

      <main className="relative w-full py-8 sm:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {/* Mensagens de sucesso/cancelamento */}
          {success && (
            <div className="mb-6 rounded-xl border-2 border-green-300 bg-gradient-to-br from-green-50 to-white p-5 shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-xl text-white">
                  ✓
                </div>
                <div>
                  <p className="text-base font-bold text-green-800">
                    Pagamento realizado com sucesso!
                  </p>
                  <p className="mt-1 text-sm text-green-700">
                    Seus créditos foram adicionados à sua conta.
                  </p>
                </div>
              </div>
            </div>
          )}

          {canceled && (
            <div className="mb-6 rounded-xl border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 to-white p-5 shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500 text-xl text-white">
                  ⚠
                </div>
                <div>
                  <p className="text-base font-bold text-yellow-800">
                    Pagamento cancelado
                  </p>
                  <p className="mt-1 text-sm text-yellow-700">
                    Nenhum crédito foi debitado. Você pode tentar novamente quando quiser.
                  </p>
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 rounded-xl border-2 border-red-300 bg-gradient-to-br from-red-50 to-white p-5 shadow-md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-xl text-white">
                  ✕
                </div>
                <div>
                  <p className="text-base font-bold text-red-800">Erro no pagamento</p>
                  <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Card de créditos atuais - Melhorado */}
          <div className="mb-8 rounded-3xl border-2 border-orange-300 bg-gradient-to-br from-orange-50 via-white to-orange-50/30 p-8 shadow-xl sm:mb-10 sm:p-10">
            <div className="text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-2">
                <span className="text-2xl">💎</span>
                <span className="text-sm font-semibold text-orange-700">Seus Créditos</span>
              </div>
              <h1 className="font-display mt-4 text-3xl font-semibold text-zinc-900 sm:text-4xl md:text-5xl">
                {credits ?? 0}
              </h1>
              <p className="mt-2 text-lg text-zinc-600 sm:text-xl">
                {credits === 1 ? "crédito disponível" : "créditos disponíveis"}
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 shadow-sm">
                <span className="text-sm text-zinc-500">1 crédito =</span>
                <span className="font-semibold text-zinc-900">1 post gerado</span>
              </div>
            </div>
          </div>

          {/* Seção de compra - Melhorada */}
          <div className="mb-8">
            <div className="mb-6 text-center">
              <h2 className="font-display mb-2 text-2xl font-semibold text-zinc-900 sm:text-3xl">
                Comprar Créditos
              </h2>
              <p className="text-sm text-zinc-600 sm:text-base">
                Escolha o pacote ideal para suas necessidades
              </p>
            </div>
            
            <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
              {/* Pacote 1 crédito - Melhorado */}
              <div className="group relative rounded-3xl border-2 border-zinc-200 bg-white p-6 shadow-lg transition hover:border-orange-300 hover:shadow-xl sm:p-8">
                <div className="mb-6 text-center">
                  <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-100 to-zinc-50 text-3xl font-bold text-zinc-700 shadow-sm sm:h-20 sm:w-20 sm:text-4xl">
                    1
                  </div>
                  <div className="mt-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                    Crédito único
                  </div>
                </div>
                <div className="mb-6 text-center">
                  <div className="mb-1 text-4xl font-bold text-orange-600 sm:text-5xl">
                    R$ 3,99
                  </div>
                  <div className="text-sm text-zinc-500">
                    por crédito
                  </div>
                </div>
                <div className="mb-6 space-y-2 text-sm text-zinc-600">
                  <div className="flex items-center gap-2">
                    <span className="text-orange-500">✓</span>
                    <span>1 post completo (imagem + legenda)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-500">✓</span>
                    <span>Ideal para testar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-500">✓</span>
                    <span>Crédito não expira</span>
                  </div>
                </div>
                <button
                  onClick={() => handlePurchase("1")}
                  disabled={isProcessing}
                  className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 text-base font-bold text-white shadow-lg transition hover:from-orange-600 hover:to-orange-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isProcessing ? "Processando..." : "Comprar 1 Crédito"}
                </button>
              </div>

              {/* Pacote 20 créditos - Melhorado */}
              <div className="group relative rounded-3xl border-2 border-orange-400 bg-gradient-to-br from-orange-50 via-white to-orange-50/50 p-6 shadow-xl transition hover:border-orange-500 hover:shadow-2xl sm:p-8">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-1.5 text-xs font-bold text-white shadow-lg">
                    ⭐ MAIS POPULAR
                  </span>
                </div>
                <div className="mb-6 text-center">
                  <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-3xl font-bold text-white shadow-md sm:h-20 sm:w-20 sm:text-4xl">
                    20
                  </div>
                  <div className="mt-2 text-sm font-semibold uppercase tracking-wide text-orange-700">
                    Melhor custo-benefício
                  </div>
                </div>
                <div className="mb-2 text-center">
                  <div className="mb-1 text-4xl font-bold text-orange-600 sm:text-5xl">
                    R$ 69,99
                  </div>
                  <div className="text-sm text-zinc-500">
                    R$ 3,50 por crédito
                  </div>
                </div>
                <div className="mb-4 rounded-xl bg-green-50 p-3 text-center">
                  <p className="text-sm font-bold text-green-700">
                    💰 Economize R$ 9,81
                  </p>
                  <p className="text-xs text-green-600">
                    Comparado ao pacote de 1 crédito
                  </p>
                </div>
                <div className="mb-6 space-y-2 text-sm text-zinc-600">
                  <div className="flex items-center gap-2">
                    <span className="text-orange-500">✓</span>
                    <span>20 posts completos (imagem + legenda)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-500">✓</span>
                    <span>Ideal para manter perfil ativo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-500">✓</span>
                    <span>Créditos não expiram</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-500">✓</span>
                    <span>Melhor preço por crédito</span>
                  </div>
                </div>
                <button
                  onClick={() => handlePurchase("20")}
                  disabled={isProcessing}
                  className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 text-base font-bold text-white shadow-lg transition hover:from-orange-600 hover:to-orange-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isProcessing ? "Processando..." : "Comprar 20 Créditos"}
                </button>
              </div>
            </div>
          </div>

          {/* Informações melhoradas */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border-2 border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-zinc-900">
                <span className="text-xl">💳</span>
                <span>Pagamento Seguro</span>
              </h3>
              <ul className="space-y-2 text-sm text-zinc-600">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500">•</span>
                  <span>Processado pelo Stripe (PCI-DSS compliant)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500">•</span>
                  <span>Aceita cartões de crédito e débito</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500">•</span>
                  <span>Pagamento 100% seguro e criptografado</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border-2 border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 font-semibold text-zinc-900">
                <span className="text-xl">⚡</span>
                <span>Como Funciona</span>
              </h3>
              <ul className="space-y-2 text-sm text-zinc-600">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500">•</span>
                  <span>Cada post gerado consome 1 crédito</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500">•</span>
                  <span>Créditos são adicionados instantaneamente</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500">•</span>
                  <span>Créditos não expiram - use quando quiser</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CreditosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 via-white to-orange-50/30">
          <div className="text-center">
            <div className="relative mx-auto mb-6 h-16 w-16">
              <div className="absolute inset-0 rounded-full border-4 border-orange-200"></div>
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-orange-500"></div>
            </div>
            <h2 className="font-display text-xl font-semibold text-zinc-900">Carregando...</h2>
          </div>
        </div>
      }
    >
      <CreditosContent />
    </Suspense>
  );
}


