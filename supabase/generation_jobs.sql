-- Tabela para armazenar jobs de geração de posts
create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  payload jsonb not null, -- Armazena o payload completo da requisição
  result jsonb, -- Armazena o resultado quando completo (post, image, etc.)
  error_message text, -- Mensagem de erro se falhar
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz, -- Quando o processamento começou
  completed_at timestamptz -- Quando o processamento terminou
);

-- Índices para melhorar performance
create index if not exists idx_generation_jobs_user_id on public.generation_jobs(user_id);
create index if not exists idx_generation_jobs_status on public.generation_jobs(status) where status in ('pending', 'processing');
create index if not exists idx_generation_jobs_created_at on public.generation_jobs(created_at desc);

-- Função para atualizar updated_at
create or replace function public.set_job_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger para atualizar updated_at
drop trigger if exists set_job_updated_at on public.generation_jobs;
create trigger set_job_updated_at
before update on public.generation_jobs
for each row execute function public.set_job_updated_at();

-- Row Level Security
alter table public.generation_jobs enable row level security;

-- Políticas de segurança
create policy "Users can read their own jobs"
  on public.generation_jobs
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own jobs"
  on public.generation_jobs
  for insert
  with check (auth.uid() = user_id);

-- Service role pode ler e atualizar todos os jobs (para o worker)
-- Isso é necessário para o worker processar jobs de qualquer usuário
-- Nota: O worker usa service role key, então não precisa de policy aqui
-- As policies acima são para acesso via anon key do frontend

