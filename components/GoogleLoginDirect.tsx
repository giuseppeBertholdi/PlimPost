"use client";

import { useState } from "react";
import { hasSupabaseConfig, supabase } from "@/lib/supabase/client";

interface GoogleLoginDirectProps {
  className?: string;
  children?: React.ReactNode;
}

export default function GoogleLoginDirect({ className, children }: GoogleLoginDirectProps) {
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
      className={className}
      disabled={isLoading}
    >
      {isLoading ? "Conectando..." : (children || "Começar agora")}
    </button>
  );
}





