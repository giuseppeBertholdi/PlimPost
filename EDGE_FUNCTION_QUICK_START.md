# ⚡ Quick Start - Supabase Edge Function

## 🎯 Setup em 5 Minutos

### 1. Instalar Supabase CLI

```bash
npm install -g supabase
```

### 2. Login e Link

```bash
supabase login
supabase link --project-ref SEU-PROJECT-REF
```

### 3. Deploy

```bash
supabase functions deploy process-jobs
```

### 4. Configurar Secrets

```bash
supabase secrets set SUPABASE_URL=https://SEU-PROJECT-REF.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sua-key
supabase secrets set GEMINI_API_KEY=sua-key
supabase secrets set OPENAI_API_KEY=sua-key
```

### 5. Configurar Cron (SQL Editor)

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'process-jobs',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://SEU-PROJECT-REF.supabase.co/functions/v1/process-jobs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

## ✅ Pronto!

A função vai rodar a cada minuto processando jobs pendentes.

Veja `SUPABASE_EDGE_FUNCTION_SETUP.md` para documentação completa.

