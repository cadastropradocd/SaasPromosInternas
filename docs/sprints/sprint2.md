# Sprint 2 — Operação, PDF e Melhorias UX

## Objetivo da Sprint

Transformar o MVP em um sistema operacional utilizável no dia a dia.

Foco:
- melhorar experiência
- adicionar geração PDF
- filtros avançados
- lojas
- melhorias visuais
- automações

Duração estimada:
1 semana

---

# Objetivos da Sprint

## Entregáveis

- geração PDF
- geração imagem WhatsApp
- gestão de lojas
- filtros avançados
- dashboard melhorado
- responsividade mobile
- duplicar promoção
- melhorias visuais

---

# Tasks — Frontend

# FE-09 — Melhorias Dashboard

## Objetivo

Criar dashboard operacional.

## Cards

- promoções ativas
- pendentes
- encerradas
- vencendo hoje
- vencendo amanhã

---

## Gráficos

### Promoções por status

### Promoções por categoria

---

## Critério de aceite

- dashboard atualizado corretamente
- dados carregando dinamicamente

---

# FE-10 — Sistema de Lojas

## Objetivo

Criar cadastro de lojas.

## Campos

| Campo |
|---|
| Nome |
| Cidade |
| Ativa |

---

## Funcionalidades

- criar loja
- editar loja
- ativar/desativar

---

## Critério de aceite

- lojas persistidas corretamente

---

# FE-11 — MultiSelect de Lojas

## Objetivo

Selecionar lojas participantes da promoção.

## Funcionalidades

- selecionar múltiplas lojas
- busca
- tags visuais

## Critério de aceite

- promoções associadas corretamente

---

# FE-12 — Melhorias da Tabela

## Objetivo

Melhorar visual operacional.

## Funcionalidades

- sticky header
- resize colunas
- esconder colunas
- densidade compacta
- seleção múltipla

---

## Critério de aceite

- tabela fluida e responsiva

---

# FE-13 — Indicadores Visuais

## Objetivo

Melhorar leitura operacional.

## Regras

### Verde
Mais de 5 dias

### Amarelo
Até 2 dias

### Vermelho
Vence amanhã

---

## Funcionalidades

- badges coloridos
- alertas visuais
- countdown validade

---

## Critério de aceite

- status visíveis claramente

---

# FE-14 — Duplicar Promoção

## Objetivo

Permitir reaproveitamento rápido.

## Funcionalidades

- botão duplicar
- copiar todos campos
- alterar datas

---

## Critério de aceite

- nova promoção criada corretamente

---

# FE-15 — Tela Gerar PDF

## Objetivo

Criar central de exportação.

## Funcionalidades

- selecionar promoções
- selecionar período
- selecionar lojas
- preview simples

---

## Botões

```txt
Gerar PDF
Gerar Imagem WhatsApp
```

---

## Critério de aceite

- tela funcional

---

# FE-16 — Responsividade Mobile

## Objetivo

Melhorar experiência celular.

## Funcionalidades

- sidebar colapsável
- cards mobile
- tabela adaptativa

---

## Critério de aceite

- sistema utilizável no celular

---

# Tasks — Backend

# BE-08 — CRUD Stores

## Objetivo

Criar gerenciamento de lojas.

## Endpoints

```http
GET /stores
POST /stores
PUT /stores/:id
DELETE /stores/:id
```

---

## Critério de aceite

- CRUD funcionando

---

# BE-09 — Relacionamento Promotion Stores

## Objetivo

Relacionar promoções às lojas.

## Migration

```sql
CREATE TABLE promotion_stores (
  promotion_id INTEGER,
  store_id INTEGER
);
```

---

## Critério de aceite

- relacionamento funcionando

---

# BE-10 — Endpoint Dashboard

## Objetivo

Centralizar métricas.

## Endpoint

```http
GET /dashboard
```

---

## Retorno

```json
{
  "active": 10,
  "pending": 5,
  "expired": 20,
  "expiring_today": 2
}
```

---

## Critério de aceite

- dashboard retornando corretamente

---

# BE-11 — PDF Generation

## Objetivo

Gerar PDF promocional.

## Biblioteca

- pdf-lib

---

## Endpoint

```http
POST /pdf/generate
```

---

## Entrada

```json
{
  "promotionIds": [1,2,3]
}
```

---

## Saída

```json
{
  "url": "/generated/file.pdf"
}
```

---

## Conteúdo PDF

- logo
- validade
- tabela produtos
- preços
- lojas

---

## Critério de aceite

- PDF gerado corretamente

---

# BE-12 — Geração Imagem WhatsApp

## Objetivo

Gerar imagem promocional vertical.

## Formato

```txt
1080x1920
```

---

## Endpoint

```http
POST /image/generate
```

---

## Critério de aceite

- imagem gerada corretamente

---

# BE-13 — Busca Avançada

## Objetivo

Melhorar pesquisa.

## Funcionalidades

- busca descrição
- busca código
- busca categoria
- busca loja

---

## Critério de aceite

- busca rápida e funcional

---

# BE-14 — Filtros por Período

## Objetivo

Filtrar promoções por datas.

## Funcionalidades

- hoje
- semana
- mês
- personalizado

---

## Critério de aceite

- filtros funcionando

---

# Banco de Dados

# Migration Stores

```sql
CREATE TABLE stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  city TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

---

# Migration Promotion Stores

```sql
CREATE TABLE promotion_stores (
  promotion_id INTEGER NOT NULL,
  store_id INTEGER NOT NULL
);
```

---

# Melhorias UI/UX

# Design

## Objetivos

- aparência ERP moderna
- leitura rápida
- foco operacional
- mobile first

---

# Componentes Novos

- MultiSelect
- StatsCard
- AlertBadge
- PDFPreview
- CountdownBadge

---

# Infraestrutura

# INFRA-02 — Storage PDFs

## Objetivo

Salvar arquivos gerados.

## Serviço

- Cloudflare R2

---

## Funcionalidades

- upload PDF
- upload imagens
- URLs temporárias

---

## Critério de aceite

- arquivos acessíveis

---

# Segurança

## Melhorias

- middleware auth global
- proteção rotas admin
- sanitização inputs

---

# Performance

## Melhorias

- cache dashboard
- lazy loading
- debounce filtros

---

# Fora da Sprint

## NÃO implementar ainda

- IA MiniMax
- WhatsApp automático
- analytics avançado
- importação Excel

---

# Resultado Esperado Sprint 2

Ao final da sprint o sistema deve:

- gerar PDFs
- gerar imagens WhatsApp
- possuir gestão de lojas
- possuir dashboard operacional
- ter UX refinada
- funcionar bem no celular
- permitir filtros avançados
- permitir duplicação rápida de promoções