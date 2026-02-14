"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { hasSupabaseConfig, supabase } from "@/lib/supabase/client";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const exchangeCode = async () => {
      try {
        const code = searchParams.get("code");

        if (!code || !hasSupabaseConfig) {
          router.replace("/");
          return;
        }

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error("Supabase auth callback error:", error.message);
        }

        router.replace("/home");
      } catch (error) {
        console.error("Erro no callback:", error);
        router.replace("/");
      } finally {
        setIsProcessing(false);
      }
    };

    exchangeCode();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-zinc-700">
      {isProcessing ? "Concluindo login..." : "Redirecionando..."}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white text-zinc-700">
          Concluindo login...
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
