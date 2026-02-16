# Configuração para Produção - PlimPost

## ⚠️ IMPORTANTE: Atualizar Price IDs do Stripe

Os `price_id` atuais são de **TESTE**. Para produção, você precisa:

1. Criar produtos no Stripe Dashboard (modo **Live**)
2. Obter os novos `price_id` de produção
3. Atualizar no arquivo `app/api/checkout/route.ts`:

```typescript
const PRICE_MAP: Record<string, { priceId: string; credits: number; amount: number }> = {
  "1": {
    priceId: "price_XXXXX", // ⚠️ SUBSTITUIR pelo price_id de PRODUÇÃO
    credits: 1,
    amount: 399,
  },
  "20": {
    priceId: "price_XXXXX", // ⚠️ SUBSTITUIR pelo price_id de PRODUÇÃO
    credits: 20,
    amount: 6999,
  },
};
```

## Variáveis de Ambiente para Produção

Configure no seu provedor de hospedagem (Vercel, etc.):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_producao
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_producao

# Google Gemini
GEMINI_API_KEY=sua_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
GEMINI_IMAGE_MODEL=gemini-2.5-flash
GEMINI_CAPTION_MODEL=gemini-2.5-flash

# Google Fonts (opcional)
NEXT_PUBLIC_GOOGLE_FONTS_API_KEY=sua_google_fonts_api_key

# Stripe PRODUÇÃO
STRIPE_SECRET_KEY=sk_live_... (chave de PRODUÇÃO)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (chave de PRODUÇÃO)
STRIPE_WEBHOOK_SECRET=whsec_... (do webhook de PRODUÇÃO)

# App URL
NEXT_PUBLIC_APP_URL=https://plimpost.com
```

## Configurações Necessárias

### 1. Supabase
- ✅ Executar todas as migrações SQL (incluindo `credits.sql`)
- ✅ Verificar storage buckets (`logos` e `posts`)
- ✅ Verificar Row Level Security (RLS) está ativado

### 2. Stripe
- ✅ Criar produtos de PRODUÇÃO
- ✅ Obter `price_id` de PRODUÇÃO
- ✅ Configurar webhook: `https://plimpost.com/api/webhooks/stripe`
- ✅ Evento: `checkout.session.completed`
- ✅ Copiar webhook secret

### 3. Google Gemini
- ✅ Verificar quota da API
- ✅ Usar chaves de produção

### 4. DNS e Domínio
- ✅ Configurar DNS apontando para o servidor
- ✅ SSL/HTTPS configurado
- ✅ Domínio `plimpost.com` funcionando

## Testes Antes de Ir ao Ar

1. ✅ Login funciona
2. ✅ Onboarding funciona
3. ✅ Geração de post funciona
4. ✅ Compra de créditos funciona (teste com cartão de teste)
5. ✅ Webhook adiciona créditos corretamente
6. ✅ Créditos aparecem no header
7. ✅ Geração de post consome créditos













