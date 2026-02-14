"use client";

import { useState } from "react";
import { hasSupabaseConfig, supabase } from "@/lib/supabase/client";

export default function GoogleLoginButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!hasSupabaseConfig) {
      console.error("Supabase config missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
      return;
    }

    setIsLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      setIsLoading(false);
      console.error("Supabase Google login error:", error.message);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogin}
      className="rounded-full border border-orange-200 px-4 py-2 text-sm font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isLoading}
    >
      {isLoading ? "Conectando..." : "Entrar com Google"}
    </button>
  );
}
