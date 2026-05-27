# Sprint 1 — Fundação do Sistema

## Objetivo da Sprint

Criar a base funcional do sistema de gestão de promoções:

- autenticação
- estrutura backend/frontend
- CRUD de promoções
- workflow básico
- telas principais
- persistência no D1

Duração estimada:
1 semana

---

# Objetivos da Sprint

## Entregáveis

- projeto inicial configurado
- login funcionando
- banco D1 configurado
- CRUD de promoções
- status PENDENTE/ATIVA/ENCERRADA
- dashboard inicial
- deploy funcionando na Cloudflare

---

# Stack

## Frontend

- React
- Vite
- TypeScript
- TailwindCSS
- shadcn/ui

---

## Backend

- Cloudflare Workers
- Hono

---

## Banco

- Cloudflare D1

---

# Estrutura Inicial do Projeto

```txt
/apps
  /web
  /api

/packages
  /types
  /ui
```

---

# Tasks — Frontend

# FE-01 — Setup Frontend

## Objetivo

Inicializar frontend React.

## Tasks

- criar projeto Vite
- configurar TypeScript
- instalar Tailwind
- instalar shadcn/ui
- configurar aliases
- configurar ESLint
- configurar Prettier

## Critério de aceite

- frontend rodando localmente
- layout base funcionando

---

# FE-02 — Layout Base

## Objetivo

Criar estrutura principal do sistema.

## Tasks

- criar sidebar
- criar topbar
- criar layout responsivo
- criar tema claro/escuro

## Sidebar

```txt
Dashboard
Cadastro
Pendentes
Ativas
Histórico
PDFs
Configurações
```

## Critério de aceite

- navegação funcionando
- layout responsivo

---

# FE-03 — Tela Login

## Objetivo

Criar autenticação básica.

## Campos

- email
- senha

## Funcionalidades

- login
- logout
- persistência sessão

## Critério de aceite

- usuário autenticado acessa sistema
- usuário não autenticado é redirecionado

---

# FE-04 — Tabela de Promoções

## Objetivo

Criar tabela principal do sistema.

## Colunas

| Coluna |
|---|
| Código |
| Descrição |
| Varejo |
| Atacado |
| Início |
| Fim |
| Status |

## Funcionalidades

- paginação
- filtros
- busca
- ordenação

## Critério de aceite

- tabela renderizando corretamente
- filtros funcionando

---

# FE-05 — Modal Criar Promoção

## Objetivo

Criar formulário de cadastro.

## Campos

- código
- descrição
- preço varejo
- preço atacado
- data início
- data fim
- observações

## Validações

- descrição obrigatória
- preço obrigatório
- data fim >= data início

## Critério de aceite

- promoção salva corretamente

---

# FE-06 — Tela Pendentes

## Objetivo

Listar promoções pendentes.

## Funcionalidades

- editar
- excluir
- lançar promoção

## Critério de aceite

- botão lançar funcionando

---

# FE-07 — Tela Ativas

## Objetivo

Listar promoções ativas.

## Funcionalidades

- filtros
- destaque visual
- badges status

## Critério de aceite

- promoções ativas exibidas corretamente

---

# FE-08 — Tela Histórico

## Objetivo

Listar promoções encerradas.

## Funcionalidades

- busca
- filtros
- visualizar histórico

## Critério de aceite

- promoções encerradas exibidas corretamente

---

# Tasks — Backend

# BE-01 — Setup API

## Objetivo

Criar backend base.

## Tasks

- configurar Hono
- configurar Workers
- configurar rotas
- configurar middleware

## Critério de aceite

- API funcionando localmente

---

# BE-02 — Configuração D1

## Objetivo

Configurar banco.

## Tasks

- criar database D1
- configurar bindings
- criar migrations

## Critério de aceite

- conexão funcionando

---

# BE-03 — Migration Promotions

## Objetivo

Criar tabela promotions.

## SQL

```sql
CREATE TABLE promotions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT,
  description TEXT NOT NULL,
  retail_price REAL NOT NULL,
  wholesale_price REAL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'PENDENTE',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## Critério de aceite

- tabela criada corretamente

---

# BE-04 — Auth API

## Objetivo

Criar autenticação JWT.

## Endpoints

```http
POST /auth/login
GET /auth/me
POST /auth/logout
```

## Critério de aceite

- login funcionando
- token validado

---

# BE-05 — CRUD Promotions

## Objetivo

Criar CRUD completo.

## Endpoints

```http
GET /promotions
POST /promotions
PUT /promotions/:id
DELETE /promotions/:id
```

## Critério de aceite

- CRUD funcionando completamente

---

# BE-06 — Workflow Promotions

## Objetivo

Criar fluxo de status.

## Regras

### Nova promoção

```txt
PENDENTE
```

### Aprovação

```txt
PENDENTE → ATIVA
```

### Expiração automática

```txt
ATIVA → ENCERRADA
```

## Endpoint

```http
POST /promotions/:id/launch
```

## Critério de aceite

- workflow funcionando

---

# BE-07 — Auto Expiração

## Objetivo

Encerrar promoções vencidas automaticamente.

## Regra

```sql
UPDATE promotions
SET status = 'ENCERRADA'
WHERE status = 'ATIVA'
AND end_date < DATE('now');
```

## Execução

- executar antes de listar promoções

## Critério de aceite

- promoções vencidas encerram automaticamente

---

# Infraestrutura

# INFRA-01 — Cloudflare Setup

## Objetivo

Preparar ambiente deploy.

## Tasks

- configurar Cloudflare Pages
- configurar Workers
- configurar D1
- configurar variáveis ambiente

## Critério de aceite

- deploy funcionando

---

# Variáveis de Ambiente

## Frontend

```env
VITE_API_URL=
```

---

## Backend

```env
JWT_SECRET=
```

---

# Design System

## Cores

### Status

- Verde → ativa
- Amarelo → vencendo
- Vermelho → encerrada
- Cinza → pendente

---

# Componentes

## Necessários Sprint 1

- Button
- Input
- Table
- Modal
- Badge
- DatePicker
- Sidebar

---

# Critérios Gerais de Aceite

## Sistema deve:

- funcionar desktop
- funcionar mobile
- persistir dados
- permitir login
- permitir CRUD completo
- permitir mudança de status
- separar promoções por telas

---

# Fora da Sprint

## NÃO implementar ainda

- IA
- WhatsApp
- PDF avançado
- analytics
- upload Excel

---

# Resultado Esperado Sprint 1

Ao final da sprint deve existir:

- sistema online
- login funcionando
- promoções cadastráveis
- promoções aprováveis
- promoções encerrando automaticamente
- dashboard básico operacional