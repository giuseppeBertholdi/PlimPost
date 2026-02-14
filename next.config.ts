import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Configurações para produção
  // output: 'standalone', // Removido para Netlify - ele usa seu próprio runtime
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
};

export default nextConfig;
