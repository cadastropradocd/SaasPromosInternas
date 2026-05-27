# Promos Prado - Sistema de Gestão de Promoções

Sistema web para gerenciamento de promoções internas da rede Prado Supermercados.

## Stack

- **Frontend**: React + Vite + TypeScript + TailwindCSS + shadcn/ui
- **Backend**: Cloudflare Pages Functions + Hono
- **Banco**: Cloudflare D1
- **Deploy**: Cloudflare Pages (tudo em um só lugar)

## Estrutura

```
apps/web/
├── functions/
│   └── api/
│       └── [[path]].ts   # API Routes (Cloudflare Pages Functions)
├── src/                   # Frontend React
└── wrangler.toml          # Configuração D1
```

## Setup Local

### Pré-requisitos

- Node.js 18+
- npm ou pnpm
- Wrangler CLI (`npm i -g wrangler`)

### Instalação

```bash
npm install
cd apps/web
npm install
```

### Configurar D1 Local

```bash
cd apps/web
wrangler d1 create promos-db --local
```

Edite `wrangler.toml` com o database_id gerado.

### Aplicar migrations

```bash
wrangler d1 migrations apply promos-db --local
```

### Rodar localmente

```bash
cd apps/web
npm run dev
```

Frontend: http://localhost:5173

## Deploy em Produção

### 1. Criar D1 na Cloudflare

```bash
cd apps/web
wrangler d1 create promos-db --remote
```

### 2. Copiar o database_id

Edite `apps/web/wrangler.toml` e substitua `CHANGE_ME` pelo ID gerado.

### 3. Aplicar migrations

```bash
wrangler d1 migrations apply promos-db --remote
```

### 4. Fazer deploy

```bash
cd apps/web
npm run build
npx wrangler pages deploy dist
```

### 5. Vincular D1 ao projeto (via Dashboard)

1. Acesse Cloudflare Dashboard → Pages → seu projeto
2. Settings → Functions → D1 Databases → Add binding
3. Selecione o D1 `promos-db`

## Credenciais de Teste

- **Comprador**: comprador@prado.com / comprador123
- **Gestor**: gestor@prado.com / gestor123

## Rotas da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Usuário autenticado |
| GET | /api/promotions | Listar promoções |
| POST | /api/promotions | Criar promoção |
| PUT | /api/promotions/:id | Editar promoção |
| DELETE | /api/promotions/:id | Excluir promoção |
| POST | /api/promotions/:id/launch | Lançar promoção |
| POST | /api/promotions/:id/duplicate | Duplicar promoção |
| GET | /api/stores | Listar lojas |
| POST | /api/stores | Criar loja |
| PUT | /api/stores/:id | Editar loja |
| DELETE | /api/stores/:id | Excluir loja |
| GET | /api/dashboard | Métricas |
| POST | /api/pdf/generate | Gerar PDF |

## Workflow

```
CADASTRO → PENDENTE → ATIVA → ENCERRADA
                          ↑ (data fim expirada)
```

- **Comprador**: cria promoções, edita pendentes
- **Gestor**: aprova/lança promoções, edita qualquer uma, exclui