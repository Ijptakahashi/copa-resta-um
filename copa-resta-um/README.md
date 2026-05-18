# 🏆 Copa Resta Um dos Idiotas 2026

Jogo de survivor pool para a Copa do Mundo 2026. 1 pick por dia, 6 vidas nos grupos, 3 no mata-mata. Último de pé leva o pote.

---

## ⚡ Setup em ~20 minutos

### 1. Supabase (banco de dados) — 7 min
1. Acesse https://supabase.com e crie uma conta gratuita
2. Crie um novo projeto (nome: `copa-resta-um`)
3. Vá em **SQL Editor** e cole o conteúdo de `supabase/schema.sql` → clique **Run**
4. Vá em **Project Settings → API** e copie:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

### 2. football-data.org (API da Copa) — 3 min
1. Acesse https://www.football-data.org/client/register
2. Crie uma conta gratuita
3. Copie sua API key → `VITE_FOOTBALL_API_KEY`

### 3. GitHub + Vercel (hospedagem) — 10 min
1. Crie um repositório no GitHub e suba este projeto:
   ```bash
   git init
   git add .
   git commit -m "Copa Resta Um"
   git remote add origin https://github.com/SEU_USER/copa-resta-um.git
   git push -u origin main
   ```
2. Acesse https://vercel.com, conecte seu GitHub e importe o repositório
3. Em **Environment Variables**, adicione as 3 variáveis do `.env.example`
4. Clique **Deploy** → em 2 minutos você tem a URL do jogo!

### 4. Compartilhe a URL com a galera
Todos acessam a mesma URL, escolhem o nome e começam a jogar.

---

## 🎮 Como jogar

| Situação | O que acontece |
|----------|---------------|
| Vitória do time escolhido | ✅ Pick certa |
| Empate | 🔵 Pick desperdiçada (sem perda de vida nos grupos) |
| Derrota | ❌ −1 vida |
| Não enviou pick até a bola rolar | 😴 −1 vida |
| Repetir time na fase de grupos | ⚠️ +1 vida extra de custo |
| Time perdeu antes = queimado | 🔴 Não pode usar nunca mais |
| Início do mata-mata (R32) | 🔄 Reset para 3 vidas |
| Vidas chegam a 0 | 💀 Eliminado |

## ⚽ Sincronização de resultados
Qualquer jogador pode clicar **"Sincronizar resultados"** no dashboard.
Isso busca automaticamente os resultados da API e atualiza as vidas de todo mundo.

---

## 🛠 Dev local

```bash
npm install
cp .env.example .env
# Preencha o .env com suas chaves
npm run dev
```

---

## 📁 Estrutura
```
src/
  pages/      Login, Dashboard, Pick, Rankings, AllPicks, Inventory
  components/ Navbar
  lib/        supabase.js, football.js, gameLogic.js
supabase/     schema.sql
```
