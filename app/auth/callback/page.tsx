"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { hasSupabaseConfig, supabase } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    // Usar window.location para evitar problemas de pre-render
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const codeParam = params.get("code");
      setCode(codeParam);
    }
  }, []);

  useEffect(() => {
    if (!code) {
      // Se não houver código, redirecionar para home
      router.replace("/");
      return;
    }

    const exchangeCode = async () => {
      try {
        if (!hasSupabaseConfig) {
          router.replace("/");
          return;
        }

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error("Supabase auth callback error:", error.message);
          router.replace("/");
          return;
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
  }, [code, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-zinc-700">
      {isProcessing ? "Concluindo login..." : "Redirecionando..."}
    </div>
  );
}
