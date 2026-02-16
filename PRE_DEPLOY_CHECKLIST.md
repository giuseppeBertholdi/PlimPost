# ✅ Checklist de Pré-Deploy

## 🎯 Status do Sistema de Background Jobs

- ✅ Edge Function `process-jobs` deployada
- ✅ `GEMINI_API_KEY` configurada como secret
- ✅ `OPENAI_API_KEY` configurada como secret
- ✅ Cron job configurado no Supabase

## 📋 Checklist Completo Antes do Deploy

### 1. Edge Function (Background Jobs)
- [x] Função `process-jobs` deployada
- [x] `GEMINI_API_KEY` configurada
- [x] `OPENAI_API_KEY` configurada
- [x] Cron job configurado e rodando

### 2. Variáveis de Ambiente da Aplicação Next.js

Configure no seu provedor de deploy (Netlify/Vercel):

**Supabase:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

**APIs:**
- [ ] `GEMINI_API_KEY`
- [ ] `OPENAI_API_KEY`
- [ ] `GEMINI_MODEL` (opcional, padrão: `gemini-1.5-flash`)
- [ ] `OPENAI_IMAGE_MODEL` (opcional, padrão: `gpt-image-1`)
- [ ] `GEMINI_CAPTION_MODEL` (opcional, padrão: `gemini-2.5-flash`)

**Stripe (Produção):**
- [ ] `STRIPE_SECRET_KEY` (chave de **PRODUÇÃO**: `sk_live_...`)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (chave de **PRODUÇÃO**: `pk_live_...`)
- [ ] `STRIPE_WEBHOOK_SECRET` (do webhook de produção)
- [ ] Atualizar `price_id` em `app/api/checkout/route.ts` ou usar variáveis:
  - [ ] `STRIPE_PRICE_ID_1_CREDIT`
  - [ ] `STRIPE_PRICE_ID_20_CREDITS`

**App:**
- [ ] `NEXT_PUBLIC_APP_URL` (ex: `https://plimpost.com`)

### 3. Supabase Database

- [ ] Todas as migrações SQL executadas:
  - [ ] `supabase/onboarding.sql`
  - [ ] `supabase/brand_font.sql`
  - [ ] `supabase/brand_fonts_title_text.sql`
  - [ ] `supabase/onboarding_update.sql`
  - [ ] `supabase/posts.sql`
  - [ ] `supabase/storage_buckets.sql`
  - [ ] `supabase/storage_policies.sql`
  - [ ] `supabase/credits.sql` ⚠️ **OBRIGATÓRIO**
  - [ ] `supabase/generation_jobs.sql` ⚠️ **OBRIGATÓRIO para background jobs**

- [ ] Storage buckets configurados:
  - [ ] Bucket `logos` (público, 5MB)
  - [ ] Bucket `posts` (público, 10MB)

### 4. Stripe (Produção)

- [ ] Criar produtos de **PRODUÇÃO** no Stripe Dashboard
- [ ] Obter `price_id` de produção
- [ ] Atualizar `price_id` em `app/api/checkout/route.ts`
- [ ] Configurar webhook:
  - [ ] URL: `https://seu-dominio.com/api/webhooks/stripe`
  - [ ] Evento: `checkout.session.completed`
  - [ ] Copiar webhook secret

### 5. Testes Finais

Antes de fazer deploy, teste localmente:

```bash
# Build local
npm run build

# Testar se compila sem erros
npm start
```

Testar fluxo completo:
- [ ] Login funciona
- [ ] Criar post gera job
- [ ] Job é processado (verificar no banco)
- [ ] Frontend recebe resultado via polling
- [ ] Post aparece na galeria

## 🚀 Pronto para Deploy!

Se todos os itens acima estão marcados, você pode fazer o deploy!

### Deploy no Netlify/Vercel

1. Conecte seu repositório
2. Configure todas as variáveis de ambiente
3. Deploy automático será feito

### Verificar após Deploy

1. **Testar criação de post:**
   - Criar um post no frontend
   - Verificar se job é criado no banco
   - Verificar se job é processado (status muda de `pending` → `processing` → `completed`)
   - Verificar se frontend recebe o resultado

2. **Verificar logs:**
   ```bash
   # Logs da Edge Function
   supabase functions logs process-jobs --tail
   
   # Verificar cron job
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-jobs-cron') 
   ORDER BY start_time DESC 
   LIMIT 10;
   ```

3. **Verificar jobs no banco:**
   ```sql
   SELECT id, status, created_at, started_at, completed_at, error_message
   FROM generation_jobs 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

---

**🎉 Tudo pronto? Pode fazer o deploy!**

