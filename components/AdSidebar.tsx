"use client";

import { useEffect, useRef } from "react";

export default function AdSidebar() {
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Só inicializar quando o elemento estiver visível e tiver largura
    const initializeAd = () => {
      if (!adRef.current) return;
      
      const element = adRef.current.querySelector('.adsbygoogle') as HTMLElement;
      if (!element) return;

      // Verificar se o elemento está visível e tem largura
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        // Tentar novamente após um pequeno delay
        setTimeout(initializeAd, 500);
        return;
      }

      try {
        // Inicializar anúncios do Google AdSense apenas se o elemento estiver visível
        if (typeof window !== "undefined" && (window as any).adsbygoogle) {
          // Verificar se já foi inicializado
          if (!element.dataset.adsbygoogleStatus) {
            ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
            element.dataset.adsbygoogleStatus = 'done';
          }
        }
      } catch (err) {
        console.error("Erro ao inicializar AdSense:", err);
      }
    };

    // Usar IntersectionObserver para garantir que o elemento está visível
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0) {
            // Elemento está visível, inicializar após um pequeno delay
            setTimeout(initializeAd, 100);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (adRef.current) {
      observer.observe(adRef.current);
    }

    // Fallback: tentar inicializar após 1 segundo se ainda não foi
    const fallbackTimeout = setTimeout(() => {
      initializeAd();
    }, 1000);

    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimeout);
    };
  }, []);

  return (
    <div ref={adRef} className="sticky top-8 h-fit w-full max-w-[160px] min-w-[160px]">
      <ins
        className="adsbygoogle"
        style={{ display: "block", minWidth: "160px", minHeight: "600px" }}
        data-ad-client="ca-pub-8037402836299749"
        data-ad-slot="auto"
        data-ad-format="vertical"
        data-full-width-responsive="false"
      />
    </div>
  );
}

