# 🚀 Setup do Worker de Processamento

## ⚠️ IMPORTANTE

O worker é **ESSENCIAL** para o sistema funcionar. Sem ele, os jobs ficam eternamente em `pending`.

## 📋 O que é o Worker?

O worker é um processo que roda **continuamente**, buscando jobs pendentes no banco e processando-os.

## 🏗️ Arquitetura Completa

```
Frontend → Cria Job (pending) → Worker → Processa → Atualiza (completed)
                ↓                                    ↓
            Polling ←───────────────────────────────┘
```

## 🚀 Como Rodar o Worker

### Opção 1: Railway (Recomendado - Mais Fácil)

1. **Criar conta no Railway**: https://railway.app
2. **Criar novo projeto** → "Deploy from GitHub repo"
3. **Selecionar seu repositório**
4. **Configurar serviço**:
   - **Build Command**: `npm install`
   - **Start Command**: `npm run worker`
   - **Root Directory**: `/` (raiz do projeto)

5. **Adicionar variáveis de ambiente**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=seu_url
   SUPABASE_SERVICE_ROLE_KEY=seu_key
   GEMINI_API_KEY=seu_key
   OPENAI_API_KEY=seu_key
   GEMINI_MODEL=gemini-1.5-flash (opcional)
   OPENAI_IMAGE_MODEL=gpt-image-1 (opcional)
   GEMINI_CAPTION_MODEL=gemini-2.5-flash (opcional)
   ```

6. **Deploy**: Railway vai iniciar o worker automaticamente

✅ **Vantagens**: Grátis até certo limite, muito fácil de configurar

---

### Opção 2: Render

1. **Criar conta no Render**: https://render.com
2. **New → Background Worker**
3. **Configurar**:
   - **Name**: `plimpost-worker`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run worker`
   - **Root Directory**: `/`

4. **Adicionar variáveis de ambiente** (mesmas do Railway)

5. **Deploy**

✅ **Vantagens**: Grátis, fácil configuração

---

### Opção 3: VPS (DigitalOcean, AWS EC2, etc.)

1. **Conectar ao servidor via SSH**
2. **Instalar Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clonar repositório**:
   ```bash
   git clone seu-repo.git
   cd plimpost
   ```

4. **Instalar dependências**:
   ```bash
   npm install
   ```

5. **Criar arquivo `.env`** com as variáveis de ambiente

6. **Rodar com PM2** (recomendado para manter rodando):
   ```bash
   npm install -g pm2
   pm2 start npm --name "plimpost-worker" -- run worker
   pm2 save
   pm2 startup  # Configurar para iniciar automaticamente
   ```

✅ **Vantagens**: Controle total, pode ser mais barato em escala

---

### Opção 4: Local (Desenvolvimento/Teste)

```bash
# Instalar dependências
npm install

# Criar arquivo .env.local com as variáveis

# Rodar worker
npm run worker
```

---

## 🔍 Verificar se está Funcionando

### 1. Logs do Worker

O worker imprime logs quando processa jobs:
```
🚀 Worker de processamento de jobs iniciado
   Intervalo de verificação: 5s
   Máximo de jobs simultâneos: 1

🔄 Processando job abc-123...
   Criado em: 16/02/2025 14:30:00
✅ Job abc-123 processado com sucesso
```

### 2. Verificar no Banco

```sql
-- Ver jobs recentes
SELECT id, status, created_at, started_at, completed_at 
FROM generation_jobs 
ORDER BY created_at DESC 
LIMIT 10;

-- Ver jobs pendentes (deve estar vazio ou diminuindo)
SELECT COUNT(*) FROM generation_jobs WHERE status = 'pending';

-- Ver jobs em processamento
SELECT COUNT(*) FROM generation_jobs WHERE status = 'processing';
```

### 3. Testar End-to-End

1. Criar um post no frontend
2. Verificar que o job é criado (`pending`)
3. Aguardar alguns segundos
4. Verificar que o status muda para `processing` e depois `completed`

---

## 🛠️ Troubleshooting

### Worker não está processando jobs

1. **Verificar se está rodando**:
   - Railway/Render: Ver logs no dashboard
   - VPS: `pm2 list` ou `ps aux | grep worker`

2. **Verificar variáveis de ambiente**:
   - Todas as variáveis necessárias estão configuradas?
   - `SUPABASE_SERVICE_ROLE_KEY` está correto?

3. **Verificar conexão com banco**:
   - Testar se consegue conectar ao Supabase
   - Verificar se há jobs pendentes no banco

4. **Verificar logs de erro**:
   - Railway/Render: Dashboard → Logs
   - VPS: `pm2 logs plimpost-worker`

### Jobs ficam em "processing" por muito tempo

1. **Verificar se o worker está rodando**
2. **Verificar logs para erros de API** (Gemini/OpenAI)
3. **Usar endpoint de reset**: `/api/jobs/reset-stuck`

### Worker para de funcionar

1. **Railway/Render**: Verificar se o serviço não foi pausado
2. **VPS**: Verificar se o processo morreu (`pm2 restart plimpost-worker`)
3. **Configurar auto-restart**: PM2 faz isso automaticamente

---

## 📊 Monitoramento

### Métricas Importantes

- **Jobs pendentes**: Deve estar sempre baixo (0-5)
- **Tempo de processamento**: Normalmente 30-120 segundos por job
- **Taxa de erro**: Deve ser < 5%

### Alertas Recomendados

1. **Jobs pendentes > 10**: Worker pode estar parado
2. **Taxa de erro > 10%**: Problema com APIs ou configuração
3. **Tempo de processamento > 5 min**: Job pode estar travado

---

## 💰 Custos

- **Railway**: Grátis até 500 horas/mês, depois $5/mês
- **Render**: Grátis, mas pode hibernar após inatividade
- **VPS**: $5-10/mês (DigitalOcean, Linode, etc.)

**Recomendação**: Comece com Railway (mais fácil) e migre para VPS se precisar de mais controle.

---

## 🔄 Atualizar Worker

Quando fizer mudanças no código do worker:

1. **Commit e push** para o repositório
2. **Railway/Render**: Deploy automático
3. **VPS**: 
   ```bash
   git pull
   npm install
   pm2 restart plimpost-worker
   ```

---

## ✅ Checklist de Setup

- [ ] Worker rodando em Railway/Render/VPS
- [ ] Variáveis de ambiente configuradas
- [ ] Worker processando jobs (verificar logs)
- [ ] Jobs mudando de `pending` → `processing` → `completed`
- [ ] Frontend recebendo resultados via polling

---

## 🎯 Próximos Passos

Após configurar o worker:

1. **Testar criação de post** no frontend
2. **Verificar que o job é processado** em tempo real
3. **Monitorar logs** nas primeiras horas
4. **Configurar alertas** (opcional)

**Parabéns! Seu sistema está completo! 🎉**

