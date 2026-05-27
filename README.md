# Promos Prado - Sistema de Gestão de Promoções

Sistema web para gerenciamento de promoções internas da rede Prado Supermercados.

## Stack

- **Frontend**: React + Vite + TypeScript + TailwindCSS + shadcn/ui
- **Backend**: Cloudflare Workers + Hono
- **Banco**: Cloudflare D1
- **Deploy**: Cloudflare Pages + Workers

## Estrutura

```
/apps
  /api      → Backend (Cloudflare Workers + Hono)
  /web      → Frontend (React + Vite)
/packages
  /types    → Tipos TypeScript compartilhados
```

## Setup Local

### Pré-requisitos

- Node.js 18+
- npm ou pnpm
- Wrangler CLI (`npm i -g wrangler`)

### Instalação

```bash
npm install
```

### Configurar D1 Local

```bash
cd apps/api
wrangler d1 create promos-db --local
```

Edite `wrangler.toml` com o database_id gerado.

### Aplicar migrations

```bash
cd apps/api
wrangler d1 migrations apply promos-db --local
```

### Rodar

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:8787

## Credenciais de Teste

- **Comprador**: comprador@prado.com / comprador123
- **Gestor**: gestor@prado.com / gestor123

## Deploy

```bash
cd apps/api
wrangler d1 create promos-db  # criar em produção
wrangler d1 migrations apply promos-db --remote
wrangler deploy
```

## Workflow

```
CADASTRO → PENDENTE → ATIVA → ENCERRADA
                          ↑ (data fim expirada)
```

- **Comprador**: cria promoções, edita pendentes
- **Gestor**: aprova/lança promoções, edita qualquer uma, exclui
