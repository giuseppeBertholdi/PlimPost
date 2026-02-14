"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { hasSupabaseConfig, supabase } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const exchangeCode = async () => {
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
    };

    exchangeCode();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-zinc-700">
      Concluindo login...
    </div>
  );
}
