# 🔧 Deploy Alternativo - Edge Function

Se você não conseguir fazer `supabase link`, use uma das alternativas abaixo:

## Opção 1: Deploy Manual via Dashboard

1. **Acesse o Dashboard do Supabase**: https://supabase.com/dashboard
2. **Vá em**: Edge Functions → Create a new function
3. **Nome**: `process-jobs`
4. **Cole o código** de `supabase/functions/process-jobs/index.ts`
5. **Configure variáveis de ambiente** no dashboard:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `OPENAI_API_KEY`
   - etc.

## Opção 2: Usar Access Token

Se o projeto está em outra organização ou você não tem permissão:

1. **Gerar Access Token**:
   - Dashboard → Account → Access Tokens
   - Criar novo token

2. **Fazer login com token**:
   ```bash
   supabase login --token seu-access-token
   ```

3. **Tentar link novamente**:
   ```bash
   supabase link --project-ref tawyxrwvffjumhdrshdd
   ```

## Opção 3: Verificar Project Ref Correto

O project-ref está na URL do seu projeto Supabase:
- URL: `https://tawyxrwvffjumhdrshdd.supabase.co`
- Project Ref: `tawyxrwvffjumhdrshdd`

Se não conseguir fazer link, você pode:

1. **Deployar manualmente** via dashboard (Opção 1)
2. **Usar o worker externo** (veja `WORKER_SETUP.md`)

## Opção 4: Usar Worker Externo (Mais Simples)

Se o Edge Function estiver complicado, use o worker externo:

1. **Railway** (recomendado): https://railway.app
2. **Render**: https://render.com
3. **VPS**: Qualquer servidor

Veja `WORKER_SETUP.md` para instruções completas.

