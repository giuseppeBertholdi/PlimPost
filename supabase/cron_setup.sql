-- Configurar cron job para executar a Edge Function process-jobs a cada minuto
-- Execute este script no SQL Editor do Supabase
-- 
-- IMPORTANTE: Se current_setting('app.settings.service_role_key') não funcionar,
-- substitua por sua SUPABASE_SERVICE_ROLE_KEY diretamente (veja alternativa abaixo)

-- Habilitar extensão pg_cron (se ainda não habilitou)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remover cron job existente (se houver)
SELECT cron.unschedule('process-jobs-cron') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-jobs-cron'
);

-- OPÇÃO 1: Usar current_setting (pode não funcionar em todos os projetos)
-- Se der erro, use a OPÇÃO 2 abaixo
SELECT cron.schedule(
  'process-jobs-cron',     -- Nome do job
  '* * * * *',              -- A cada minuto (cron: minuto hora dia mês dia-semana)
  $$
  SELECT
    net.http_post(
      url := 'https://tawyxrwvffjumhdrshdd.supabase.co/functions/v1/process-jobs',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- OPÇÃO 2: Se a OPÇÃO 1 não funcionar, use esta (substitua SUA_SERVICE_ROLE_KEY)
-- Descomente e substitua SUA_SERVICE_ROLE_KEY pela sua chave real
/*
SELECT cron.schedule(
  'process-jobs-cron',
  '* * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://tawyxrwvffjumhdrshdd.supabase.co/functions/v1/process-jobs',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer SUA_SERVICE_ROLE_KEY_AQUI'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
*/

-- Verificar se foi criado
SELECT * FROM cron.job WHERE jobname = 'process-jobs-cron';

-- Verificar execuções recentes (útil para debug)
-- SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-jobs-cron') ORDER BY start_time DESC LIMIT 10;

-- Para remover o cron job depois (se necessário):
-- SELECT cron.unschedule('process-jobs-cron');

