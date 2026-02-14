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
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <a
            href="/home"
            className="font-display text-lg font-semibold text-zinc-900"
          >
            PlimPost
          </a>
          <a
            href="/home"
            className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50"
          >
            Voltar
          </a>
        </div>
      </header>

      <main className="relative w-full py-12">
        <div className="mx-auto max-w-4xl px-6">
          {/* Mensagens de sucesso/cancelamento */}
          {success && (
            <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-semibold text-green-700">
                ✅ Pagamento realizado com sucesso! Seus créditos foram adicionados.
              </p>
            </div>
          )}

          {canceled && (
            <div className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm font-semibold text-yellow-700">
                ⚠️ Pagamento cancelado. Nenhum crédito foi debitado.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-700">{errorMessage}</p>
            </div>
          )}

          {/* Card de créditos atuais */}
          <div className="mb-8 rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50/50 to-white p-8 shadow-lg">
            <div className="text-center">
              <h1 className="font-display text-3xl font-semibold text-zinc-900 md:text-4xl">
                Seus Créditos
              </h1>
              <div className="mt-4">
                <div className="inline-flex items-center gap-3 rounded-2xl bg-white px-8 py-4 shadow-md">
                  <span className="text-5xl font-bold text-orange-600">
                    {credits ?? 0}
                  </span>
                  <span className="text-lg text-zinc-600">
                    {credits === 1 ? "crédito" : "créditos"}
                  </span>
                </div>
              </div>
              <p className="mt-4 text-sm text-zinc-600">
                1 crédito = 1 post gerado
              </p>
            </div>
          </div>

          {/* Pacotes de créditos */}
          <div className="mb-8">
            <h2 className="mb-6 text-center text-2xl font-semibold text-zinc-900">
              Comprar Créditos
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Pacote 1 crédito */}
              <div className="rounded-2xl border-2 border-zinc-200 bg-white p-6 shadow-sm transition hover:border-orange-300 hover:shadow-md">
                <div className="mb-4 text-center">
                  <div className="mb-2 text-3xl font-bold text-zinc-900">1</div>
                  <div className="text-sm text-zinc-500">crédito</div>
                </div>
                <div className="mb-4 text-center">
                  <span className="text-3xl font-bold text-orange-600">R$ 3,99</span>
                </div>
                <button
                  onClick={() => handlePurchase("1")}
                  disabled={isProcessing}
                  className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:from-orange-600 hover:to-orange-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isProcessing ? "Processando..." : "Comprar"}
                </button>
              </div>

              {/* Pacote 20 créditos */}
              <div className="rounded-2xl border-2 border-orange-300 bg-gradient-to-br from-orange-50/50 to-white p-6 shadow-md transition hover:border-orange-400 hover:shadow-lg">
                <div className="mb-2 text-center">
                  <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-bold text-white">
                    MAIS POPULAR
                  </span>
                </div>
                <div className="mb-4 text-center">
                  <div className="mb-2 text-3xl font-bold text-zinc-900">20</div>
                  <div className="text-sm text-zinc-500">créditos</div>
                </div>
                <div className="mb-2 text-center">
                  <span className="text-3xl font-bold text-orange-600">R$ 69,99</span>
                </div>
                <div className="mb-4 text-center">
                  <span className="text-sm text-zinc-500">
                    Economize R$ 9,81
                  </span>
                </div>
                <button
                  onClick={() => handlePurchase("20")}
                  disabled={isProcessing}
                  className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:from-orange-600 hover:to-orange-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isProcessing ? "Processando..." : "Comprar"}
                </button>
              </div>
            </div>
          </div>

          {/* Informações */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 font-semibold text-zinc-900">Como funciona?</h3>
            <ul className="space-y-2 text-sm text-zinc-600">
              <li className="flex items-start gap-2">
                <span className="text-orange-500">•</span>
                <span>Cada post gerado consome 1 crédito</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500">•</span>
                <span>Os créditos não expiram</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500">•</span>
                <span>Pagamento seguro via Stripe</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500">•</span>
                <span>Créditos são adicionados automaticamente após o pagamento</span>
              </li>
            </ul>
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


