-- Tabela para armazenar posts gerados
create table if not exists public.generated_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_text text not null,
  post_image_url text,
  objective text not null,
  main_theme text not null,
  extra_info text,
  palette_name text,
  palette_colors text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índice para melhorar performance nas consultas
create index if not exists idx_generated_posts_user_id on public.generated_posts(user_id);
create index if not exists idx_generated_posts_created_at on public.generated_posts(created_at desc);

-- Função para atualizar updated_at
create or replace function public.set_post_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger para atualizar updated_at
drop trigger if exists set_post_updated_at on public.generated_posts;
create trigger set_post_updated_at
before update on public.generated_posts
for each row execute function public.set_post_updated_at();

-- Row Level Security
alter table public.generated_posts enable row level security;

-- Políticas de segurança
create policy "Users can read their own posts"
  on public.generated_posts
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own posts"
  on public.generated_posts
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own posts"
  on public.generated_posts
  for update
  using (auth.uid() = user_id);

create policy "Users can delete their own posts"
  on public.generated_posts
  for delete
  using (auth.uid() = user_id);
