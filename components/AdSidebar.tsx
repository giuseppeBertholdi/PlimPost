"use client";

import { useEffect } from "react";

export default function AdSidebar() {
  useEffect(() => {
    try {
      // Inicializar anúncios do Google AdSense
      if (typeof window !== "undefined" && (window as any).adsbygoogle) {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch (err) {
      console.error("Erro ao inicializar AdSense:", err);
    }
  }, []);

  return (
    <div className="sticky top-8 h-fit w-full max-w-[160px]">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client="ca-pub-8037402836299749"
        data-ad-slot="auto"
        data-ad-format="vertical"
        data-full-width-responsive="false"
      />
    </div>
  );
}

