# Sistema de Background Jobs - Setup

## ✅ Implementação Completa

O sistema de geração assíncrona de posts foi implementado com sucesso! Agora os posts são gerados em background, sem depender do limite de 26 segundos do Netlify.

## 📋 O que foi implementado

1. **Tabela de Jobs** (`supabase/generation_jobs.sql`)
   - Armazena jobs com status: `pending`, `processing`, `completed`, `failed`
   - Inclui payload completo e resultado

2. **API de Criação de Jobs** (`/api/generate`)
   - Cria job no banco ao invés de processar diretamente
   - Retorna `jobId` para o frontend fazer polling

3. **API de Status** (`/api/jobs/[jobId]`)
   - Consulta o status de um job específico
   - Retorna status, resultado ou erro

4. **API de Processamento** (`/api/jobs/process`)
   - Processa jobs pendentes
   - Pode ser chamada por cron job ou worker separado
   - Tem timeout de 5 minutos (não limitado a 26s)

5. **Frontend com Polling** (`app/home/page.tsx`)
   - Faz polling do status do job a cada 2 segundos
   - Mostra resultado quando completo
   - Trata erros adequadamente

## 🚀 Como usar

### 1. Executar o SQL no Supabase

Execute o arquivo `supabase/generation_jobs.sql` no Supabase SQL Editor para criar a tabela de jobs.

### 2. Configurar Worker Secret (Opcional)

Para proteger o endpoint de processamento, adicione no `.env.local`:

```bash
WORKER_SECRET_TOKEN=seu-token-secreto-aqui
```

Se não configurar, o endpoint ainda funcionará, mas será público.

### 3. Configurar Worker (OBRIGATÓRIO)

⚠️ **IMPORTANTE**: Sem o worker, os jobs ficam eternamente em `pending`!

O worker é um processo que roda continuamente processando jobs. Veja `WORKER_SETUP.md` para instruções detalhadas.

**Opções rápidas**:
- **Railway** (recomendado): Mais fácil, grátis até 500h/mês
- **Render**: Grátis, fácil configuração
- **VPS**: Mais controle, $5-10/mês

### 4. Processar Jobs (Alternativa - Não Recomendado)

Se não puder rodar um worker dedicado, você pode usar cron jobs (menos confiável):

#### Opção A: Chamada Automática (Já implementado)
O frontend já chama `/api/jobs/process` automaticamente após criar um job. Isso funciona bem para baixo volume.

#### Opção B: Cron Job no Netlify
Configure um cron job no Netlify para chamar `/api/jobs/process` periodicamente (ex: a cada 1 minuto):

```toml
# netlify.toml
[[plugins]]
  package = "@netlify/plugin-scheduled-functions"

[[plugins.inputs.schedules]]
  cron = "*/1 * * * *"  # A cada 1 minuto
  path = "/api/jobs/process"
```

#### Opção C: Worker Separado
Crie um worker separado (ex: em outro servidor ou Vercel Cron) que chama `/api/jobs/process` periodicamente.

Exemplo usando Vercel Cron:
```json
// vercel.json
{
  "crons": [{
    "path": "/api/jobs/process",
    "schedule": "*/1 * * * *"
  }]
}
```

## 🔄 Fluxo Completo

1. **Usuário pede o post** → Frontend chama `/api/generate`
2. **API cria job** → Job criado com status `pending` no banco
3. **Frontend inicia polling** → Consulta `/api/jobs/[jobId]` a cada 2s
4. **Worker processa** → `/api/jobs/process` busca job pendente e processa
5. **Job completo** → Status muda para `completed` com resultado
6. **Frontend recebe** → Polling detecta status `completed` e mostra resultado

## 📊 Vantagens

✅ **Não depende do limite de 26s** - Worker pode processar por até 5 minutos  
✅ **Escala melhor** - Múltiplos workers podem processar jobs em paralelo  
✅ **UX profissional** - Usuário vê progresso em tempo real  
✅ **Resiliente** - Jobs falhos podem ser reprocessados  
✅ **Rastreável** - Histórico completo de jobs no banco

## 🛠️ Monitoramento

Para monitorar jobs, você pode consultar a tabela `generation_jobs`:

```sql
-- Jobs pendentes
SELECT * FROM generation_jobs WHERE status = 'pending' ORDER BY created_at;

-- Jobs em processamento
SELECT * FROM generation_jobs WHERE status = 'processing' ORDER BY started_at;

-- Jobs falhos (para reprocessar)
SELECT * FROM generation_jobs WHERE status = 'failed' ORDER BY created_at DESC;
```

## 🔧 Troubleshooting

### Jobs não estão sendo processados

1. Verifique se o endpoint `/api/jobs/process` está acessível
2. Verifique logs do servidor para erros
3. Verifique se há jobs pendentes no banco
4. Se usar cron, verifique se está configurado corretamente

### Jobs ficam em "processing" por muito tempo

1. **Resetar jobs travados**: Chame `/api/jobs/reset-stuck` para resetar jobs travados há mais de 5 minutos
2. Verifique se o worker está rodando
3. Verifique logs para erros de API (Gemini/OpenAI)
4. Jobs são automaticamente marcados como `failed` após timeout de 4 minutos

**Solução rápida**: Configure um cron job para chamar `/api/jobs/reset-stuck` periodicamente:

```toml
# netlify.toml
[[plugins.inputs.schedules]]
  cron = "*/5 * * * *"  # A cada 5 minutos
  path = "/api/jobs/reset-stuck"
```

### Frontend não recebe resultado

1. Verifique se o polling está funcionando (console do navegador)
2. Verifique se o job foi completado no banco
3. Verifique timeout do polling (máximo 5 minutos)
4. Se o job estiver travado, use `/api/jobs/reset-stuck` para resetá-lo

## 📝 Notas

- O sistema é compatível com o código existente
- Jobs antigos podem ser limpos periodicamente (ex: após 7 dias)
- Considere adicionar retry automático para jobs falhos
- Para alta escala, considere usar Redis Queue ao invés de banco

