````md
# Sprint 3 — Correção Estrutural, Deploy, API, Auth e Banco

## Status

```txt
PLANEJADA
````

## Tipo

```txt
Correção / Saneamento Técnico / Estabilização
```

## Prioridade

```txt
P0 — Bloqueadora
```

## Objetivo da Sprint

Corrigir a base técnica do projeto **SaaS Promos Internas / Promos Prado** antes de continuar o desenvolvimento de novas funcionalidades.

Esta sprint deve estabilizar:

* deploy em produção
* rotas do React no Cloudflare Pages
* arquitetura oficial da API
* chamadas frontend/backend
* autenticação
* banco de dados
* permissões
* status das promoções
* soft delete
* histórico/auditoria
* documentação mínima de produção

O projeto tem como objetivo substituir a planilha operacional de promoções internas por um SaaS interno completo, com cadastro de promoções, aprovação, lançamento, histórico, PDF, WhatsApp e evoluções futuras com IA. 

---

# 1. Escopo da Sprint

## Dentro do escopo

Esta sprint deve corrigir:

* erro de produção no Cloudflare Pages
* fallback SPA para React Router
* padronização da API em `/api/*`
* eliminação da ambiguidade entre Worker separado e Pages Functions
* helper único para chamadas HTTP no frontend
* tratamento de erro de API
* autenticação baseada em tabela `users`
* roles oficiais
* migrations de saneamento
* status `CANCELADA`
* soft delete
* histórico de ações
* campos de lançamento, cancelamento e encerramento
* categorias
* sessões
* arquivos gerados
* dashboard considerando os novos campos
* documentação de deploy
* checklist de smoke test

## Fora do escopo

Não implementar nesta sprint:

* IA para artes promocionais
* geração avançada de banners
* integração Cloudflare R2
* WhatsApp avançado
* importação de planilhas
* multiempresa
* cobrança/assinatura
* relatórios avançados
* gráficos complexos
* painel de administração completo de usuários
* design final de PDF
* Drizzle ORM, salvo se for necessário para concluir correções

---

# 2. Problemas que esta Sprint resolve

## P0-01 — Produção quebrada

Erro observado:

```txt
Unsafe attempt to load URL
https://saaspromosinternas.pages.dev/
from frame with URL chrome-error://chromewebdata/
Domains, protocols and ports must match.
```

Possíveis causas:

* app não publicado corretamente
* falta de `_redirects`
* React Router quebrando em refresh
* configuração incorreta do Cloudflare Pages
* conflito entre Pages Functions e Worker separado
* API inacessível em produção

---

## P0-02 — SPA sem fallback

O frontend usa React Router com rotas como:

```txt
/login
/
/pendentes
/ativas
/historico
/lojas
/pdfs
```

Sem fallback, Cloudflare Pages pode retornar erro ao acessar rotas internas diretamente.

---

## P0-03 — API duplicada

Existem duas abordagens possíveis:

```txt
apps/api
```

e:

```txt
apps/web/functions/api/[[path]].ts
```

A sprint deve definir uma única arquitetura oficial para evitar duplicidade.

---

## P0-04 — Chamadas de API inconsistentes

O frontend mistura chamadas diretas para:

```txt
/api/*
```

com fallback baseado em:

```txt
VITE_API_URL
```

A sprint deve padronizar todas as chamadas.

---

## P0-05 — Auth hardcoded

Usuários fixos no código devem deixar de ser a fonte principal de autenticação.

Exemplo atual:

```txt
comprador@prado.com / comprador123
gestor@prado.com / gestor123
```

A sprint deve preparar autenticação real com tabela `users`.

---

## P0-06 — Banco incompleto

Modelo planejado:

```txt
users
stores
categories
promotions
promotion_stores
promotion_history
generated_files
sessions
```

A sprint deve alinhar o banco com esse desenho.

---

## P0-07 — Status incompleto

Status atuais:

```txt
PENDENTE
ATIVA
ENCERRADA
```

Status necessários:

```txt
PENDENTE
ATIVA
ENCERRADA
CANCELADA
```

---

## P0-08 — Exclusão física

Exclusões não devem remover dados definitivamente.

Deve ser usado:

```txt
deleted_at
```

---

## P0-09 — Falta de histórico

Ações críticas precisam ser registradas:

```txt
CREATE_PROMOTION
UPDATE_PROMOTION
LAUNCH_PROMOTION
CANCEL_PROMOTION
CLOSE_PROMOTION
DUPLICATE_PROMOTION
SOFT_DELETE_PROMOTION
GENERATE_PDF
```

---

# 3. Decisões Técnicas Obrigatórias

## DEC-01 — Arquitetura oficial da Sprint

Usar:

```txt
Cloudflare Pages
  ├── React/Vite frontend
  └── Pages Functions em /api/*
      └── Hono + D1 + JWT
```

API oficial:

```txt
apps/web/functions/api/[[path]].ts
```

---

## DEC-02 — Diretório `apps/api`

Durante esta sprint:

```txt
apps/api
```

deve ser tratado como legado temporário ou referência.

Não evoluir `apps/api` e `apps/web/functions/api` ao mesmo tempo.

---

## DEC-03 — URL oficial da API

Todas as chamadas do frontend devem usar:

```txt
/api/*
```

Não depender de:

```txt
VITE_API_URL
```

nesta sprint.

---

## DEC-04 — Roles oficiais

Usar somente:

```txt
ADMIN
GESTOR
COMPRADOR
```

Não usar:

```txt
BUYER
MANAGER
COMPRADOR/GESTOR misturado com inglês
```

---

## DEC-05 — Status oficiais

Usar somente:

```txt
PENDENTE
ATIVA
ENCERRADA
CANCELADA
```

---

## DEC-06 — Exclusão

Não usar exclusão física para dados operacionais principais.

Usar soft delete em:

```txt
promotions
stores
categories
users
```

---

# 4. Arquivos que devem ser criados

```txt
apps/web/public/_redirects
apps/web/src/lib/api.ts
docs/deploy/production.md
docs/sprints/sprint3-correcao-estrutural-deploy-api-auth-banco.md
```

---

# 5. Arquivos que devem ser alterados

```txt
apps/web/vite.config.ts
apps/web/src/contexts/AuthContext.tsx
apps/web/src/pages/Login.tsx
apps/web/src/pages/Dashboard.tsx
apps/web/src/pages/Pendentes.tsx
apps/web/src/pages/Ativas.tsx
apps/web/src/pages/Historico.tsx
apps/web/src/pages/Stores.tsx
apps/web/src/pages/PDFs.tsx
apps/web/src/components/PromotionModal.tsx
apps/web/src/components/DuplicateModal.tsx
apps/web/src/components/PromotionTable.tsx
apps/web/functions/api/[[path]].ts
packages/types/src/index.ts
README.md
```

---

# 6. Migration esperada

Criar migration:

```txt
apps/web/functions/api/migrations/0003_sprint3_saneamento.sql
```

Se o projeto mantiver migrations em outro diretório, manter padrão já existente, mas documentar claramente qual diretório é a fonte oficial.

---

# 7. Tasks Detalhadas

---

## S3-001 — Criar fallback SPA para Cloudflare Pages

### Tipo

```txt
Fix
```

### Prioridade

```txt
P0
```

### Objetivo

Garantir que rotas internas do React funcionem em produção, inclusive com refresh.

### Arquivo

Criar:

```txt
apps/web/public/_redirects
```

### Conteúdo

```txt
/* /index.html 200
```

### Critérios de aceite

* `/` abre corretamente
* `/login` abre diretamente
* `/pendentes` abre diretamente
* `/ativas` abre diretamente
* `/historico` abre diretamente
* `/lojas` abre diretamente
* `/pdfs` abre diretamente
* refresh em qualquer rota não retorna 404
* erro `chrome-error://chromewebdata` não ocorre por rota SPA quebrada

### Como testar

```bash
cd apps/web
npm run build
```

Depois confirmar que o arquivo `_redirects` foi copiado para:

```txt
apps/web/dist/_redirects
```

---

## S3-002 — Validar configuração base do Vite

### Tipo

```txt
Fix
```

### Prioridade

```txt
P0
```

### Objetivo

Garantir que o build do Vite funcione na raiz do domínio Pages.

### Arquivo

```txt
apps/web/vite.config.ts
```

### Requisito

Garantir:

```ts
export default defineConfig({
  base: '/',
})
```

Preservar:

* plugin React
* aliases existentes
* configurações de build existentes

### Critérios de aceite

* assets JS carregam sem 404
* assets CSS carregam sem 404
* app abre em `/`
* app abre em `/login`
* app funciona em produção no domínio Pages

---

## S3-003 — Definir Pages Functions como API oficial

### Tipo

```txt
Arquitetura
```

### Prioridade

```txt
P0
```

### Objetivo

Eliminar conflito entre API separada e API dentro do Pages.

### Regra

A API oficial será:

```txt
apps/web/functions/api/[[path]].ts
```

### Rotas obrigatórias

```txt
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/logout

GET    /api/promotions
GET    /api/promotions/:id
POST   /api/promotions
PUT    /api/promotions/:id
DELETE /api/promotions/:id
POST   /api/promotions/:id/launch
POST   /api/promotions/:id/cancel
POST   /api/promotions/:id/duplicate

GET    /api/stores
GET    /api/stores/:id
POST   /api/stores
PUT    /api/stores/:id
DELETE /api/stores/:id

GET    /api/categories
GET    /api/categories/:id
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id

GET    /api/dashboard

POST   /api/pdf/generate
```

### Critérios de aceite

* todas as rotas acima existem
* rotas protegidas exigem JWT
* rotas públicas são somente as necessárias para login/healthcheck
* frontend não usa Worker externo
* frontend não usa URL absoluta para API

---

## S3-004 — Criar endpoint healthcheck

### Tipo

```txt
Fix
```

### Prioridade

```txt
P0
```

### Objetivo

Permitir teste simples da API em produção.

### Endpoint

```txt
GET /api/health
```

### Resposta esperada

```json
{
  "ok": true,
  "service": "promos-prado-api",
  "version": "3.0.0"
}
```

### Critérios de aceite

* endpoint responde sem autenticação
* endpoint não consulta banco
* endpoint funciona em produção
* usado no smoke test

---

## S3-005 — Criar helper único de API no frontend

### Tipo

```txt
Refactor obrigatório
```

### Prioridade

```txt
P0
```

### Arquivo

Criar:

```txt
apps/web/src/lib/api.ts
```

### Objetivo

Remover `fetch` direto espalhado pelo frontend.

### API esperada

```ts
export class ApiError extends Error {
  status: number
  code?: string
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T>
```

### Regras

* `path` deve começar com `/api`
* se não começar, lançar erro em desenvolvimento
* adicionar `Authorization` automaticamente quando houver token
* adicionar `Content-Type: application/json` quando houver body
* tratar resposta vazia
* tratar resposta JSON inválida
* tratar erro 401
* tratar erro 403
* tratar erro 404
* tratar erro 500
* tratar falha de rede

### Mensagens obrigatórias

```txt
Não foi possível conectar à API.
Sessão expirada. Faça login novamente.
Você não tem permissão para esta ação.
Recurso não encontrado.
Erro inesperado no servidor.
```

### Critérios de aceite

* nenhum componente usa `fetch('/api`
* todos usam `apiFetch`
* mensagens de erro aparecem corretamente
* token é enviado automaticamente
* erro de sessão expirada desloga o usuário ou redireciona para `/login`

---

## S3-006 — Refatorar AuthContext

### Tipo

```txt
Fix / Refactor
```

### Prioridade

```txt
P0
```

### Arquivo

```txt
apps/web/src/contexts/AuthContext.tsx
```

### Objetivo

Centralizar autenticação e sessão.

### Requisitos

O contexto deve expor:

```ts
user
token
loading
login(email, password)
logout()
refreshMe()
isAdmin
isGestor
isComprador
```

### Regras

* token salvo em `localStorage`
* user salvo em `localStorage`
* ao carregar app, validar `/api/auth/me`
* se token inválido, limpar sessão
* se `/api/auth/me` falhar com 401, deslogar
* login deve usar `apiFetch`
* logout deve limpar sessão local mesmo se API falhar

### Critérios de aceite

* login funciona
* refresh da página mantém sessão
* token inválido remove sessão
* logout funciona
* usuário sem login vai para `/login`
* usuário logado não fica preso no loading

---

## S3-007 — Remover credenciais fixas visíveis em produção

### Tipo

```txt
Segurança
```

### Prioridade

```txt
P1
```

### Arquivo

```txt
apps/web/src/pages/Login.tsx
```

### Objetivo

Não exibir senhas de teste em produção.

### Regra

Mostrar credenciais demo somente se:

```ts
import.meta.env.DEV
```

ou:

```txt
VITE_SHOW_DEMO_CREDENTIALS=true
```

### Critérios de aceite

* produção não mostra senha
* dev pode mostrar credenciais
* login continua funcionando

---

## S3-008 — Criar tabela users

### Tipo

```txt
Banco
```

### Prioridade

```txt
P0
```

### Migration

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('ADMIN', 'GESTOR', 'COMPRADOR')),
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
```

### Critérios de aceite

* tabela existe no D1
* email é único
* role aceita somente roles oficiais
* usuário deletado não pode logar
* usuário inativo não pode logar

---

## S3-009 — Implementar login usando users do banco

### Tipo

```txt
Auth
```

### Prioridade

```txt
P0
```

### Endpoint

```txt
POST /api/auth/login
```

### Entrada

```json
{
  "email": "gestor@prado.com",
  "password": "senha"
}
```

### Resposta

```json
{
  "token": "jwt",
  "user": {
    "id": 1,
    "name": "Gestor",
    "email": "gestor@prado.com",
    "role": "GESTOR"
  }
}
```

### Regras

* buscar usuário por email
* ignorar usuários com `deleted_at IS NOT NULL`
* bloquear usuários com `active = 0`
* validar senha por hash
* gerar JWT com expiração
* token deve conter:

  * `sub`
  * `email`
  * `role`
  * `name`

### Critérios de aceite

* login não usa array hardcoded
* senha não fica salva em texto puro
* credencial inválida retorna 401
* usuário inativo retorna 403
* usuário deletado retorna 401 ou 403
* token funciona em rotas protegidas

---

## S3-010 — Definir estratégia de hash compatível com Cloudflare Workers

### Tipo

```txt
Segurança
```

### Prioridade

```txt
P0
```

### Objetivo

Definir e implementar hashing de senha compatível com ambiente Workers/Pages Functions.

### Requisitos

* não usar lib incompatível com Workers
* preferir WebCrypto quando possível
* se usar PBKDF2, armazenar salt + hash
* função de verify deve ser assíncrona
* senha nunca deve ser logada

### Interface sugerida

```ts
async function hashPassword(password: string): Promise<string>
async function verifyPassword(password: string, storedHash: string): Promise<boolean>
```

### Critérios de aceite

* criar usuário com hash
* login valida senha corretamente
* hash possui salt
* não existe senha em texto puro no banco

---

## S3-011 — Criar seed inicial de usuários

### Tipo

```txt
Banco / DevOps
```

### Prioridade

```txt
P0
```

### Objetivo

Permitir login inicial sem hardcode.

### Usuários demo

```txt
admin@prado.com
gestor@prado.com
comprador@prado.com
```

### Roles

```txt
ADMIN
GESTOR
COMPRADOR
```

### Regras

* seed local pode usar senha demo
* produção deve exigir troca de senha ou criação manual documentada
* não versionar senha real de produção
* documentar como criar primeiro admin

### Critérios de aceite

* ambiente local possui usuários
* produção possui procedimento de bootstrap
* README/deploy explica o processo
* login demo funciona em dev

---

## S3-012 — Atualizar tipos globais

### Tipo

```txt
Types
```

### Prioridade

```txt
P0
```

### Arquivo

```txt
packages/types/src/index.ts
```

### Adicionar/alterar

```ts
export type UserRole = 'ADMIN' | 'GESTOR' | 'COMPRADOR'

export type PromotionStatus =
  | 'PENDENTE'
  | 'ATIVA'
  | 'ENCERRADA'
  | 'CANCELADA'
```

### User

```ts
export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  active: number
  created_at: string
  updated_at?: string | null
  deleted_at?: string | null
}
```

### Promotion

Incluir:

```ts
category_id?: number | null
launched_by?: number | null
launched_at?: string | null
closed_at?: string | null
cancelled_by?: number | null
cancelled_at?: string | null
updated_at?: string | null
deleted_at?: string | null
```

### Critérios de aceite

* frontend compila
* backend compila
* roles antigas removidas
* status antigos continuam funcionando
* status `CANCELADA` aceito

---

## S3-013 — Adicionar campos faltantes em promotions

### Tipo

```txt
Banco
```

### Prioridade

```txt
P0
```

### Migration

```sql
ALTER TABLE promotions ADD COLUMN category_id INTEGER;
ALTER TABLE promotions ADD COLUMN launched_by INTEGER;
ALTER TABLE promotions ADD COLUMN launched_at TEXT;
ALTER TABLE promotions ADD COLUMN closed_at TEXT;
ALTER TABLE promotions ADD COLUMN cancelled_by INTEGER;
ALTER TABLE promotions ADD COLUMN cancelled_at TEXT;
ALTER TABLE promotions ADD COLUMN updated_at TEXT;
ALTER TABLE promotions ADD COLUMN deleted_at TEXT;

CREATE INDEX IF NOT EXISTS idx_promotions_category ON promotions(category_id);
CREATE INDEX IF NOT EXISTS idx_promotions_created_by ON promotions(created_by);
CREATE INDEX IF NOT EXISTS idx_promotions_deleted_at ON promotions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_promotions_launched_at ON promotions(launched_at);
CREATE INDEX IF NOT EXISTS idx_promotions_closed_at ON promotions(closed_at);
```

### Critérios de aceite

* migration roda no D1
* dados antigos continuam acessíveis
* listagens ignoram `deleted_at`
* lançamento preenche `launched_by` e `launched_at`
* encerramento preenche `closed_at`
* cancelamento preenche `cancelled_by` e `cancelled_at`

---

## S3-014 — Adicionar status CANCELADA

### Tipo

```txt
Banco / Backend / Frontend
```

### Prioridade

```txt
P0
```

### Objetivo

Permitir cancelamento sem exclusão.

### Backend

Aceitar status:

```txt
PENDENTE
ATIVA
ENCERRADA
CANCELADA
```

### Frontend

Exibir badge para:

```txt
CANCELADA
```

### Observação técnica

Se a tabela atual tiver `CHECK(status IN (...))`, D1/SQLite pode exigir recriação da tabela para alterar o CHECK.

### Estratégias aceitas

#### Opção A — Recriar tabela

* criar `promotions_new`
* copiar dados
* remover tabela antiga
* renomear tabela nova
* recriar índices

#### Opção B — Remover dependência de CHECK

* validar status no backend
* manter campo TEXT sem CHECK na próxima estrutura

### Critérios de aceite

* promoção pode ser cancelada
* cancelada não aparece em ativas
* cancelada não aparece em pendentes
* cancelada aparece no histórico
* dashboard conta canceladas separadamente

---

## S3-015 — Criar tabela categories

### Tipo

```txt
Feature técnica obrigatória
```

### Prioridade

```txt
P1
```

### Migration

```sql
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(active);
CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON categories(deleted_at);
```

### Endpoints

```txt
GET    /api/categories
GET    /api/categories/:id
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id
```

### Permissões

```txt
ADMIN: tudo
GESTOR: tudo
COMPRADOR: apenas listar ativas
```

### Critérios de aceite

* categoria criada
* categoria editada
* categoria inativada
* categoria deletada com soft delete
* listagem padrão ignora deletadas
* promoção aceita `category_id`

---

## S3-016 — Atualizar formulário de promoção para categoria

### Tipo

```txt
Frontend
```

### Prioridade

```txt
P1
```

### Arquivo

```txt
apps/web/src/components/PromotionModal.tsx
```

### Objetivo

Permitir selecionar categoria na promoção.

### Requisitos

* buscar categorias ativas em `/api/categories`
* mostrar select de categoria
* enviar `category_id`
* preencher categoria ao editar promoção
* validar categoria se obrigatório

### Critérios de aceite

* usuário seleciona categoria
* categoria aparece ao editar
* categoria aparece na tabela
* filtro por categoria funciona, se implementado nesta sprint

---

## S3-017 — Implementar soft delete em promotions

### Tipo

```txt
Backend
```

### Prioridade

```txt
P0
```

### Endpoint afetado

```txt
DELETE /api/promotions/:id
```

### Antes

```sql
DELETE FROM promotions WHERE id = ?
```

### Depois

```sql
UPDATE promotions
SET deleted_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE id = ?
AND deleted_at IS NULL;
```

### Regras

* apenas ADMIN/GESTOR
* não remover promotion_stores
* não remover histórico
* registrar histórico `SOFT_DELETE_PROMOTION`

### Critérios de aceite

* promoção não é removida do banco
* promoção sai das listagens padrão
* histórico é preservado
* tentar deletar já deletada retorna erro adequado ou idempotência documentada

---

## S3-018 — Implementar soft delete em stores

### Tipo

```txt
Backend
```

### Prioridade

```txt
P1
```

### Migration

```sql
ALTER TABLE stores ADD COLUMN updated_at TEXT;
ALTER TABLE stores ADD COLUMN deleted_at TEXT;

CREATE INDEX IF NOT EXISTS idx_stores_deleted_at ON stores(deleted_at);
```

### Endpoint afetado

```txt
DELETE /api/stores/:id
```

### SQL

```sql
UPDATE stores
SET deleted_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP,
    active = 0
WHERE id = ?
AND deleted_at IS NULL;
```

### Critérios de aceite

* loja não é removida fisicamente
* loja deletada não aparece em listagens padrão
* promoções antigas continuam referenciando loja
* apenas ADMIN/GESTOR podem deletar

---

## S3-019 — Implementar soft delete em categories

### Tipo

```txt
Backend
```

### Prioridade

```txt
P1
```

### Endpoint afetado

```txt
DELETE /api/categories/:id
```

### SQL

```sql
UPDATE categories
SET deleted_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP,
    active = 0
WHERE id = ?
AND deleted_at IS NULL;
```

### Critérios de aceite

* categoria não é removida fisicamente
* categoria deletada não aparece em selects
* promoções antigas continuam com referência
* apenas ADMIN/GESTOR podem deletar

---

## S3-020 — Criar tabela promotion_history

### Tipo

```txt
Auditoria
```

### Prioridade

```txt
P0
```

### Migration

```sql
CREATE TABLE IF NOT EXISTS promotion_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  promotion_id INTEGER NOT NULL,
  user_id INTEGER,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  payload TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promotion_history_promotion ON promotion_history(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_history_user ON promotion_history(user_id);
CREATE INDEX IF NOT EXISTS idx_promotion_history_action ON promotion_history(action);
CREATE INDEX IF NOT EXISTS idx_promotion_history_created_at ON promotion_history(created_at);
```

### Ações obrigatórias

```txt
CREATE_PROMOTION
UPDATE_PROMOTION
LAUNCH_PROMOTION
CANCEL_PROMOTION
CLOSE_PROMOTION
DUPLICATE_PROMOTION
SOFT_DELETE_PROMOTION
GENERATE_PDF
```

### Payload

Salvar JSON com dados relevantes.

Exemplo:

```json
{
  "changed_fields": ["retail_price", "end_date"],
  "source": "web"
}
```

### Critérios de aceite

* criar promoção gera histórico
* editar promoção gera histórico
* lançar promoção gera histórico
* cancelar promoção gera histórico
* duplicar promoção gera histórico
* soft delete gera histórico
* gerar PDF gera histórico se houver promoção vinculada

---

## S3-021 — Criar helper backend para histórico

### Tipo

```txt
Backend Refactor
```

### Prioridade

```txt
P0
```

### Objetivo

Evitar repetição de INSERT em histórico.

### Função sugerida

```ts
async function createPromotionHistory(db, input: {
  promotion_id: number
  user_id?: number
  action: string
  old_status?: string | null
  new_status?: string | null
  payload?: unknown
})
```

### Critérios de aceite

* rotas usam helper
* payload é serializado com segurança
* erro ao gravar histórico não deve mascarar erro principal sem log
* ações críticas registradas

---

## S3-022 — Corrigir lançamento de promoção

### Tipo

```txt
Backend
```

### Prioridade

```txt
P0
```

### Endpoint

```txt
POST /api/promotions/:id/launch
```

### Permissão

```txt
ADMIN
GESTOR
```

### Regra

Só lançar se:

```txt
status = PENDENTE
deleted_at IS NULL
```

### SQL

```sql
UPDATE promotions
SET status = 'ATIVA',
    launched_by = ?,
    launched_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE id = ?
AND status = 'PENDENTE'
AND deleted_at IS NULL;
```

### Histórico

Registrar:

```txt
LAUNCH_PROMOTION
```

com:

```txt
old_status = PENDENTE
new_status = ATIVA
```

### Critérios de aceite

* comprador não lança
* gestor lança
* admin lança
* promoção lançada aparece em ativas
* `launched_by` preenchido
* `launched_at` preenchido
* histórico registrado

---

## S3-023 — Criar cancelamento de promoção

### Tipo

```txt
Backend / Frontend
```

### Prioridade

```txt
P0
```

### Endpoint

```txt
POST /api/promotions/:id/cancel
```

### Permissão

```txt
ADMIN
GESTOR
```

### Pode cancelar

```txt
PENDENTE
ATIVA
```

### Não pode cancelar

```txt
ENCERRADA
CANCELADA
```

### SQL

```sql
UPDATE promotions
SET status = 'CANCELADA',
    cancelled_by = ?,
    cancelled_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE id = ?
AND status IN ('PENDENTE', 'ATIVA')
AND deleted_at IS NULL;
```

### Histórico

Registrar:

```txt
CANCEL_PROMOTION
```

### Frontend

Adicionar ação na tabela para ADMIN/GESTOR:

```txt
Cancelar
```

### Critérios de aceite

* cancelar pendente funciona
* cancelar ativa funciona
* cancelar encerrada falha
* cancelar cancelada falha
* comprador não cancela
* cancelada aparece no histórico
* cancelada não aparece em pendentes/ativas

---

## S3-024 — Corrigir encerramento automático

### Tipo

```txt
Backend
```

### Prioridade

```txt
P0
```

### Objetivo

Encerrar promoções vencidas com `closed_at`.

### SQL

```sql
UPDATE promotions
SET status = 'ENCERRADA',
    closed_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP
WHERE status = 'ATIVA'
AND date(end_date) < date('now')
AND closed_at IS NULL
AND deleted_at IS NULL;
```

### Observação

Se possível, registrar histórico para cada promoção encerrada.

Fluxo recomendado:

1. selecionar promoções ativas vencidas
2. atualizar cada uma
3. gravar `CLOSE_PROMOTION` para cada uma

### Critérios de aceite

* promoção vencida sai de ativas
* promoção vencida aparece em histórico
* `closed_at` preenchido
* deletadas não são processadas
* canceladas não são processadas
* histórico registrado quando viável

---

## S3-025 — Corrigir criação de promoção

### Tipo

```txt
Backend
```

### Prioridade

```txt
P0
```

### Endpoint

```txt
POST /api/promotions
```

### Regras

* descrição obrigatória
* preço varejo obrigatório
* data início obrigatória
* data fim obrigatória
* data fim >= data início
* status inicial sempre `PENDENTE`
* `created_by` deve ser id real do usuário
* aceitar `category_id`
* aceitar `store_ids`
* criar relação em `promotion_stores`
* registrar histórico

### Histórico

```txt
CREATE_PROMOTION
```

### Critérios de aceite

* comprador cria promoção
* gestor cria promoção
* admin cria promoção
* promoção nasce pendente
* lojas são associadas
* categoria é associada
* histórico é registrado

---

## S3-026 — Corrigir edição de promoção

### Tipo

```txt
Backend
```

### Prioridade

```txt
P0
```

### Endpoint

```txt
PUT /api/promotions/:id
```

### Permissões

```txt
ADMIN: edita qualquer
GESTOR: edita qualquer
COMPRADOR: edita apenas própria PENDENTE
```

### Regras

* não editar deletada
* não editar cancelada, exceto ADMIN/GESTOR se regra permitir
* atualizar `updated_at`
* atualizar `promotion_stores` quando `store_ids` enviado
* atualizar `category_id`
* registrar histórico com campos alterados

### Critérios de aceite

* comprador edita própria pendente
* comprador não edita ativa
* comprador não edita promoção de outro
* gestor edita qualquer não deletada
* admin edita qualquer não deletada
* histórico registrado

---

## S3-027 — Corrigir duplicação de promoção

### Tipo

```txt
Backend / Frontend
```

### Prioridade

```txt
P1
```

### Endpoint

```txt
POST /api/promotions/:id/duplicate
```

### Regras

* duplicar promoção existente não deletada
* nova promoção sempre nasce `PENDENTE`
* copiar:

  * code
  * description
  * retail_price
  * wholesale_price
  * category_id
  * notes
  * stores
* exigir novas datas:

  * start_date
  * end_date
* validar data fim >= data início
* `created_by` deve ser usuário atual
* não copiar:

  * launched_by
  * launched_at
  * closed_at
  * cancelled_by
  * cancelled_at
  * deleted_at

### Histórico

Registrar na nova promoção:

```txt
DUPLICATE_PROMOTION
```

Payload:

```json
{
  "source_promotion_id": 123
}
```

### Critérios de aceite

* duplicação funciona
* nova promoção aparece em pendentes
* lojas copiadas
* categoria copiada
* status pendente
* histórico registrado

---

## S3-028 — Criar tabela sessions

### Tipo

```txt
Auth / Banco
```

### Prioridade

```txt
P1
```

### Migration

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  refresh_token_hash TEXT,
  expires_at TEXT,
  revoked_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_revoked ON sessions(revoked_at);
```

### Nesta sprint

Implementação mínima aceita:

* tabela criada
* login pode registrar sessão simples
* logout pode revogar sessão se existir identificação

### Critérios de aceite

* tabela existe
* não quebra login
* base preparada para refresh token futuro

---

## S3-029 — Criar tabela generated_files

### Tipo

```txt
Banco / PDF
```

### Prioridade

```txt
P1
```

### Migration

```sql
CREATE TABLE IF NOT EXISTS generated_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  promotion_id INTEGER,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  storage_key TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_generated_files_promotion ON generated_files(promotion_id);
CREATE INDEX IF NOT EXISTS idx_generated_files_created_by ON generated_files(created_by);
CREATE INDEX IF NOT EXISTS idx_generated_files_type ON generated_files(file_type);
```

### Critérios de aceite

* tabela existe
* geração PDF pode registrar metadados
* não precisa integrar R2 nesta sprint
* não precisa salvar binário no banco

---

## S3-030 — Corrigir geração de PDF para registrar histórico

### Tipo

```txt
Backend
```

### Prioridade

```txt
P2
```

### Endpoint

```txt
POST /api/pdf/generate
```

### Regras

* exigir autenticação
* receber lista de promoções
* ignorar promoções deletadas
* registrar em `generated_files`
* registrar histórico `GENERATE_PDF` quando houver promotion_id
* manter retorno atual se necessário

### Critérios de aceite

* PDF continua funcionando
* não inclui promoções deletadas
* metadados salvos
* histórico salvo

---

## S3-031 — Corrigir dashboard

### Tipo

```txt
Backend / Frontend
```

### Prioridade

```txt
P0
```

### Endpoint

```txt
GET /api/dashboard
```

### Métricas obrigatórias

```txt
pending
active
expired
cancelled
expiring_today
expiring_tomorrow
expiring_week
stores_active
categories_active
```

### Regras SQL

Todas as contagens de promoções devem incluir:

```sql
deleted_at IS NULL
```

Ativas:

```sql
status = 'ATIVA'
```

Pendentes:

```sql
status = 'PENDENTE'
```

Encerradas:

```sql
status = 'ENCERRADA'
```

Canceladas:

```sql
status = 'CANCELADA'
```

### Critérios de aceite

* dashboard carrega com banco vazio
* dashboard ignora deletadas
* dashboard separa canceladas
* dashboard mostra vencendo hoje
* dashboard mostra vencendo amanhã
* dashboard mostra vencendo em 7 dias
* frontend não quebra se campo vier 0

---

## S3-032 — Corrigir listagem de promoções

### Tipo

```txt
Backend
```

### Prioridade

```txt
P0
```

### Endpoint

```txt
GET /api/promotions
```

### Query params

```txt
status
search
store_id
category_id
period
limit
offset
```

### Periods

```txt
today
tomorrow
week
month
expired
```

### Regras

* sempre ignorar `deleted_at IS NOT NULL`
* ordenar por `created_at DESC`
* aplicar paginação
* limitar `limit` máximo a 100
* default `limit = 50`
* default `offset = 0`

### Critérios de aceite

* filtro status funciona
* busca por código funciona
* busca por descrição funciona
* filtro loja funciona
* filtro categoria funciona
* filtro período funciona
* paginação funciona
* deletadas não aparecem

---

## S3-033 — Corrigir tela Pendentes

### Tipo

```txt
Frontend
```

### Prioridade

```txt
P0
```

### Requisitos

* usar `apiFetch`
* listar apenas `PENDENTE`
* botão nova promoção
* botão editar
* botão duplicar
* botão lançar apenas ADMIN/GESTOR
* botão cancelar apenas ADMIN/GESTOR
* botão excluir apenas ADMIN/GESTOR
* mostrar erro amigável

### Critérios de aceite

* comprador vê pendentes
* comprador cria promoção
* comprador edita própria pendente
* gestor lança
* gestor cancela
* gestor exclui com soft delete
* atualização refaz listagem

---

## S3-034 — Corrigir tela Ativas

### Tipo

```txt
Frontend
```

### Prioridade

```txt
P0
```

### Requisitos

* usar `apiFetch`
* listar apenas `ATIVA`
* mostrar indicadores de vencimento
* botão duplicar
* botão cancelar para ADMIN/GESTOR
* botão gerar PDF se aplicável
* não mostrar deletadas
* não mostrar canceladas
* não mostrar encerradas

### Critérios de aceite

* ativas carregam
* vencendo hoje destacado
* vencendo amanhã destacado
* cancelamento remove da tela
* erro de API tratado

---

## S3-035 — Corrigir tela Histórico

### Tipo

```txt
Frontend
```

### Prioridade

```txt
P1
```

### Requisitos

* listar `ENCERRADA` e `CANCELADA`
* permitir filtro por status
* permitir busca
* mostrar datas:

  * start_date
  * end_date
  * closed_at
  * cancelled_at
* não mostrar deletadas por padrão

### Critérios de aceite

* encerradas aparecem
* canceladas aparecem
* deletadas não aparecem
* filtros funcionam

---

## S3-036 — Corrigir tela Stores

### Tipo

```txt
Frontend / Backend
```

### Prioridade

```txt
P1
```

### Requisitos

* usar `apiFetch`
* listar lojas não deletadas
* criar loja
* editar loja
* ativar/desativar
* soft delete
* apenas ADMIN/GESTOR podem alterar

### Critérios de aceite

* comprador não altera loja
* gestor cria loja
* gestor edita loja
* gestor deleta loja com soft delete
* loja deletada não aparece

---

## S3-037 — Criar tela ou suporte básico para Categories

### Tipo

```txt
Frontend / Backend
```

### Prioridade

```txt
P1
```

### Requisitos mínimos

* endpoint funcional
* select no formulário de promoção
* se possível, tela simples para gestão

### Tela opcional

```txt
/categories
```

ou dentro de configurações.

### Critérios de aceite

* categorias podem ser criadas
* categorias podem ser usadas em promoção
* comprador lista categorias ativas
* gestor/admin gerenciam

---

## S3-038 — Corrigir permissões no backend

### Tipo

```txt
Segurança
```

### Prioridade

```txt
P0
```

### Criar helpers

```ts
requireAuth()
requireRole(['ADMIN', 'GESTOR'])
canEditPromotion(user, promotion)
```

### Matriz obrigatória

| Ação                     | ADMIN | GESTOR | COMPRADOR |
| ------------------------ | ----: | -----: | --------: |
| Login                    |   Sim |    Sim |       Sim |
| Criar promoção           |   Sim |    Sim |       Sim |
| Editar própria pendente  |   Sim |    Sim |       Sim |
| Editar qualquer promoção |   Sim |    Sim |       Não |
| Lançar promoção          |   Sim |    Sim |       Não |
| Cancelar promoção        |   Sim |    Sim |       Não |
| Encerrar manualmente     |   Sim |    Sim |       Não |
| Soft delete promoção     |   Sim |    Sim |       Não |
| Gerenciar lojas          |   Sim |    Sim |       Não |
| Gerenciar categorias     |   Sim |    Sim |       Não |
| Gerenciar usuários       |   Sim |    Não |       Não |
| Gerar PDF                |   Sim |    Sim |       Sim |

### Critérios de aceite

* permissões aplicadas no backend
* frontend pode esconder botões, mas segurança real fica no backend
* comprador não consegue burlar via DevTools

---

## S3-039 — Corrigir CORS e headers

### Tipo

```txt
Infra / Backend
```

### Prioridade

```txt
P1
```

### Objetivo

Garantir que a API funcione em Pages Functions.

### Regras

Como a API está no mesmo domínio:

```txt
/api/*
```

CORS não deve ser problema principal.

Ainda assim, manter headers compatíveis:

```txt
Content-Type
Authorization
```

### Critérios de aceite

* login funciona em produção
* requisições autenticadas funcionam
* não há erro de CORS no console

---

## S3-040 — Criar documentação de produção

### Tipo

```txt
Docs
```

### Prioridade

```txt
P0
```

### Arquivo

```txt
docs/deploy/production.md
```

### Conteúdo obrigatório

```md
# Deploy Produção — Promos Prado

## Arquitetura

Cloudflare Pages + Pages Functions + D1

## Build

cd apps/web
npm install
npm run build

## Deploy

npx wrangler pages deploy dist --project-name=saaspromosinternas

## Bindings obrigatórios

DB
JWT_SECRET

## D1

- criar banco
- aplicar migrations
- vincular ao Pages

## Secrets

JWT_SECRET

## Rotas de teste

GET /api/health
POST /api/auth/login
GET /api/dashboard
GET /api/promotions

## Smoke test frontend

/
 /login
 /pendentes
 /ativas
 /historico
 /lojas
 /pdfs

## Rollback

- voltar último deploy estável no Cloudflare Pages
- restaurar backup D1 se necessário
```

### Critérios de aceite

* documentação criada
* documentação permite reproduzir deploy
* documentação lista bindings
* documentação lista smoke test

---

# 8. Migration consolidada sugerida

> Ajustar conforme estado real do banco. Se algum `ALTER TABLE` já tiver sido aplicado, a migration deve ser idempotente ou dividida.

```sql
-- Sprint 3 — Correção Estrutural, Auth e Banco

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('ADMIN', 'GESTOR', 'COMPRADOR')),
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS promotion_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  promotion_id INTEGER NOT NULL,
  user_id INTEGER,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  payload TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  refresh_token_hash TEXT,
  expires_at TEXT,
  revoked_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS generated_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  promotion_id INTEGER,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  storage_key TEXT,
  created_by INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(active);
CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON categories(deleted_at);

CREATE INDEX IF NOT EXISTS idx_promotion_history_promotion ON promotion_history(promotion_id);
CREATE INDEX IF NOT EXISTS idx_promotion_history_user ON promotion_history(user_id);
CREATE INDEX IF NOT EXISTS idx_promotion_history_action ON promotion_history(action);
CREATE INDEX IF NOT EXISTS idx_promotion_history_created_at ON promotion_history(created_at);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_revoked ON sessions(revoked_at);

CREATE INDEX IF NOT EXISTS idx_generated_files_promotion ON generated_files(promotion_id);
CREATE INDEX IF NOT EXISTS idx_generated_files_created_by ON generated_files(created_by);
CREATE INDEX IF NOT EXISTS idx_generated_files_type ON generated_files(file_type);

-- Campos adicionais em promotions
ALTER TABLE promotions ADD COLUMN category_id INTEGER;
ALTER TABLE promotions ADD COLUMN launched_by INTEGER;
ALTER TABLE promotions ADD COLUMN launched_at TEXT;
ALTER TABLE promotions ADD COLUMN closed_at TEXT;
ALTER TABLE promotions ADD COLUMN cancelled_by INTEGER;
ALTER TABLE promotions ADD COLUMN cancelled_at TEXT;
ALTER TABLE promotions ADD COLUMN updated_at TEXT;
ALTER TABLE promotions ADD COLUMN deleted_at TEXT;

CREATE INDEX IF NOT EXISTS idx_promotions_category ON promotions(category_id);
CREATE INDEX IF NOT EXISTS idx_promotions_created_by ON promotions(created_by);
CREATE INDEX IF NOT EXISTS idx_promotions_deleted_at ON promotions(deleted_at);
CREATE INDEX IF NOT EXISTS idx_promotions_launched_at ON promotions(launched_at);
CREATE INDEX IF NOT EXISTS idx_promotions_closed_at ON promotions(closed_at);

-- Campos adicionais em stores
ALTER TABLE stores ADD COLUMN updated_at TEXT;
ALTER TABLE stores ADD COLUMN deleted_at TEXT;

CREATE INDEX IF NOT EXISTS idx_stores_deleted_at ON stores(deleted_at);
```

---

# 9. Seeds sugeridos

## Categorias iniciais

```txt
Mercearia
Bebidas
Limpeza
Higiene
Açougue
Hortifruti
Frios
Padaria
Congelados
Outros
```

## Usuários demo

```txt
Admin
admin@prado.com
ADMIN

Gestor
gestor@prado.com
GESTOR

Comprador
comprador@prado.com
COMPRADOR
```

## Observação

Senha demo apenas em ambiente local ou staging.

Não usar senha real versionada.

---

# 10. Smoke Test Obrigatório

## 10.1 Build

```bash
cd apps/web
npm install
npm run build
```

### Deve passar

```txt
sim
```

---

## 10.2 Arquivos no build

Verificar:

```txt
dist/index.html
dist/_redirects
```

### Deve existir

```txt
sim
```

---

## 10.3 Rotas frontend

Testar em produção:

```txt
https://saaspromosinternas.pages.dev/
https://saaspromosinternas.pages.dev/login
https://saaspromosinternas.pages.dev/pendentes
https://saaspromosinternas.pages.dev/ativas
https://saaspromosinternas.pages.dev/historico
https://saaspromosinternas.pages.dev/lojas
https://saaspromosinternas.pages.dev/pdfs
```

### Critérios

* todas abrem
* refresh funciona
* não aparece `chrome-error://chromewebdata`
* não aparece tela branca

---

## 10.4 Rotas API

Testar:

```txt
GET /api/health
POST /api/auth/login
GET /api/auth/me
GET /api/dashboard
GET /api/promotions
GET /api/stores
GET /api/categories
```

### Critérios

* health responde sem token
* login responde com token
* rotas protegidas exigem token
* rotas protegidas funcionam com token

---

## 10.5 Fluxo completo

Executar:

1. Login como ADMIN
2. Criar loja
3. Criar categoria
4. Criar promoção pendente
5. Editar promoção
6. Lançar promoção
7. Confirmar que aparece em Ativas
8. Cancelar promoção
9. Confirmar que sai de Ativas
10. Confirmar que aparece no Histórico
11. Criar nova promoção
12. Duplicar promoção
13. Excluir promoção duplicada
14. Confirmar que soft delete remove da listagem
15. Confirmar registros em `promotion_history`

---

# 11. Definition of Done

A Sprint 3 só estará concluída quando todos os itens abaixo forem verdadeiros:

```txt
[ ] App abre em produção
[ ] /login abre diretamente
[ ] refresh em rotas internas funciona
[ ] _redirects existe e vai para o dist
[ ] API oficial é /api/*
[ ] Pages Functions acessa D1
[ ] /api/health responde
[ ] Login usa tabela users
[ ] Senhas não estão hardcoded no fluxo principal
[ ] Roles oficiais são ADMIN/GESTOR/COMPRADOR
[ ] Status oficiais são PENDENTE/ATIVA/ENCERRADA/CANCELADA
[ ] Promoções usam soft delete
[ ] Stores usam soft delete
[ ] Categories existem
[ ] Promotion history existe
[ ] Lançamento preenche launched_by e launched_at
[ ] Cancelamento preenche cancelled_by e cancelled_at
[ ] Encerramento automático preenche closed_at
[ ] Dashboard ignora deletadas
[ ] Dashboard mostra canceladas
[ ] Frontend usa apiFetch
[ ] Não há fetch('/api') direto em componentes
[ ] Erros de API são tratados
[ ] Credenciais demo não aparecem em produção
[ ] Documentação de deploy existe
[ ] Smoke test completo passou
```

---

# 12. Ordem de Execução Recomendada

```txt
1. Criar _redirects
2. Ajustar vite.config.ts
3. Criar /api/health
4. Definir Pages Functions como API oficial
5. Criar apiFetch
6. Refatorar AuthContext
7. Refatorar telas para apiFetch
8. Criar migration users/categories/history/sessions/generated_files
9. Adicionar campos faltantes em promotions/stores
10. Implementar hash de senha
11. Implementar login por users
12. Criar seed inicial
13. Padronizar roles
14. Adicionar status CANCELADA
15. Implementar soft delete promotions
16. Implementar soft delete stores
17. Implementar categories
18. Corrigir lançamento
19. Criar cancelamento
20. Corrigir encerramento automático
21. Corrigir dashboard
22. Corrigir listagens/filtros
23. Corrigir telas Pendentes/Ativas/Histórico
24. Registrar promotion_history
25. Registrar generated_files no PDF
26. Criar docs/deploy/production.md
27. Rodar build
28. Rodar deploy
29. Rodar smoke test
```

---

# 13. Critérios de Bloqueio

Se qualquer item abaixo falhar, a sprint não deve ser considerada concluída:

```txt
- app não abre em produção
- /login quebra no refresh
- API não acessa D1
- login ainda depende de usuários hardcoded
- frontend ainda usa chamadas fetch diretas espalhadas
- exclusão física continua sendo usada para promoções
- status CANCELADA não existe
- dashboard conta promoções deletadas
- histórico não registra ações críticas
```

---

# 14. Nota para Implementação

Não adicionar novas funcionalidades fora desta sprint.

Não mexer em IA.

Não mexer em WhatsApp avançado.

Não mexer em R2.

Não redesenhar o layout inteiro.

Não refatorar visual sem necessidade.

Foco absoluto:

```txt
produção funcionando
API única
auth real
banco correto
soft delete
histórico
permissões
deploy documentado
```

```
```
