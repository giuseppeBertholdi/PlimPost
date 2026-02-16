"use client";

import { useEffect, useRef, useState } from "react";

export default function AdSidebar() {
  const adRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Evitar múltiplas inicializações
    if (initializedRef.current || isInitialized) return;

    // Aguardar o script do AdSense carregar
    const waitForAdSense = () => {
      if (typeof window === "undefined") return false;
      return !!(window as any).adsbygoogle;
    };

    const initializeAd = () => {
      if (initializedRef.current) return;
      if (!adRef.current) return;
      
      const element = adRef.current.querySelector('.adsbygoogle') as HTMLElement;
      if (!element) return;

      // Verificar se o elemento está visível e tem largura válida
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return false; // Ainda não está pronto
      }

      // Verificar se já foi inicializado
      if (element.dataset.adsbygoogleStatus === 'done') {
        initializedRef.current = true;
        setIsInitialized(true);
        return true;
      }

      // Verificar se o AdSense está carregado
      if (!waitForAdSense()) {
        return false; // AdSense ainda não carregou
      }

      try {
        // Inicializar apenas uma vez
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        element.dataset.adsbygoogleStatus = 'done';
        initializedRef.current = true;
        setIsInitialized(true);
        return true;
      } catch (err) {
        // Silenciar erros do AdSense para não poluir o console
        console.warn("AdSense initialization:", err);
        return false;
      }
    };

    // Usar IntersectionObserver para garantir que o elemento está visível
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.1) {
            // Elemento está visível, tentar inicializar
            if (waitForAdSense()) {
              setTimeout(() => {
                initializeAd();
              }, 200);
            } else {
              // Aguardar o AdSense carregar
              const checkInterval = setInterval(() => {
                if (waitForAdSense()) {
                  clearInterval(checkInterval);
                  setTimeout(() => {
                    initializeAd();
                  }, 200);
                }
              }, 100);
              
              // Timeout após 5 segundos
              setTimeout(() => {
                clearInterval(checkInterval);
              }, 5000);
            }
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (adRef.current) {
      observer.observe(adRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [isInitialized]);

  return (
    <div ref={adRef} className="sticky top-8 h-fit w-full max-w-[160px] min-w-[160px]">
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "160px", height: "600px" }}
        data-ad-client="ca-pub-8037402836299749"
        data-ad-format="vertical"
        data-full-width-responsive="false"
      />
    </div>
  );
}

