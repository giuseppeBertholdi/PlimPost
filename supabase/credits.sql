-- Tabela para armazenar créditos dos usuários
create table if not exists public.user_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credits integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índice para melhorar performance
create index if not exists idx_user_credits_user_id on public.user_credits(user_id);

-- Função para atualizar updated_at
create or replace function public.set_credits_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger para atualizar updated_at
drop trigger if exists set_credits_updated_at on public.user_credits;
create trigger set_credits_updated_at
before update on public.user_credits
for each row execute function public.set_credits_updated_at();

-- Row Level Security
alter table public.user_credits enable row level security;

-- Políticas de segurança
create policy "Users can read their own credits"
  on public.user_credits
  for select
  using (auth.uid() = user_id);

create policy "Users can update their own credits"
  on public.user_credits
  for update
  using (auth.uid() = user_id);

-- Tabela para histórico de transações de créditos
create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null, -- positivo para adição, negativo para uso
  description text not null,
  stripe_payment_intent_id text, -- ID do pagamento do Stripe (se aplicável)
  created_at timestamptz not null default now()
);

-- Índices
create index if not exists idx_credit_transactions_user_id on public.credit_transactions(user_id);
create index if not exists idx_credit_transactions_created_at on public.credit_transactions(created_at desc);
create index if not exists idx_credit_transactions_stripe_payment_intent_id on public.credit_transactions(stripe_payment_intent_id);

-- Row Level Security
alter table public.credit_transactions enable row level security;

-- Políticas de segurança
create policy "Users can read their own transactions"
  on public.credit_transactions
  for select
  using (auth.uid() = user_id);

-- Função para adicionar créditos (usada pelo webhook do Stripe)
create or replace function public.add_user_credits(
  p_user_id uuid,
  p_amount integer,
  p_description text,
  p_stripe_payment_intent_id text default null
)
returns void as $$
declare
  current_credits integer;
begin
  -- Inserir ou atualizar créditos
  insert into public.user_credits (user_id, credits)
  values (p_user_id, p_amount)
  on conflict (user_id) do update
  set credits = user_credits.credits + p_amount,
      updated_at = now();

  -- Registrar transação
  insert into public.credit_transactions (
    user_id,
    amount,
    description,
    stripe_payment_intent_id
  )
  values (
    p_user_id,
    p_amount,
    p_description,
    p_stripe_payment_intent_id
  );
end;
$$ language plpgsql security definer;

-- Função para usar créditos (usada pela API de geração)
create or replace function public.use_user_credits(
  p_user_id uuid,
  p_amount integer,
  p_description text
)
returns boolean as $$
declare
  current_credits integer;
begin
  -- Verificar créditos disponíveis
  select credits into current_credits
  from public.user_credits
  where user_id = p_user_id;

  -- Se não existir registro, criar com 0 créditos
  if current_credits is null then
    insert into public.user_credits (user_id, credits)
    values (p_user_id, 0)
    on conflict (user_id) do nothing;
    current_credits := 0;
  end if;

  -- Verificar se tem créditos suficientes
  if current_credits < p_amount then
    return false;
  end if;

  -- Decrementar créditos
  update public.user_credits
  set credits = credits - p_amount,
      updated_at = now()
  where user_id = p_user_id;

  -- Registrar transação
  insert into public.credit_transactions (
    user_id,
    amount,
    description
  )
  values (
    p_user_id,
    -p_amount,
    p_description
  );

  return true;
end;
$$ language plpgsql security definer;

