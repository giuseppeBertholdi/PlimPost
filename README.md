# PlimPost

Gerador de posts profissionais para Instagram com IA. Crie imagens e legendas prontas para publicar em segundos.

## 🚀 Deploy Rápido

### 1. Variáveis de Ambiente

Configure todas as variáveis de ambiente no seu provedor de hospedagem. Veja `DEPLOY.md` para a lista completa.

**Obrigatórias:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `STRIPE_SECRET_KEY` (produção: `sk_live_...`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (produção: `pk_live_...`)
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL=https://plimpost.com`

### 2. Supabase

Execute todas as migrações SQL na ordem:
1. `supabase/onboarding.sql`
2. `supabase/brand_font.sql`
3. `supabase/brand_fonts_title_text.sql`
4. `supabase/onboarding_update.sql`
5. `supabase/posts.sql`
6. `supabase/storage_buckets.sql`
7. `supabase/storage_policies.sql`
8. `supabase/credits.sql` ⚠️ **OBRIGATÓRIO**

### 3. Stripe

1. Criar produtos de **PRODUÇÃO** no Stripe Dashboard
2. Obter `price_id` de produção
3. Atualizar em `app/api/checkout/route.ts` ou usar variáveis:
   - `STRIPE_PRICE_ID_1_CREDIT`
   - `STRIPE_PRICE_ID_20_CREDITS`
4. Configurar webhook: `https://plimpost.com/api/webhooks/stripe`
5. Evento: `checkout.session.completed`

### 4. Build e Deploy

```bash
npm install
npm run build
npm start
```

## 📚 Documentação

- `DEPLOY.md` - Guia completo de deploy
- `PRODUCTION_SETUP.md` - Checklist de produção
- `STRIPE_WEBHOOK_SETUP.md` - Configuração do webhook do Stripe

## 🛠️ Desenvolvimento

```bash
npm run dev
```

## 📝 Licença

Proprietário - PlimPost
