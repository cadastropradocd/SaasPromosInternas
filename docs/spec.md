# SPEC — Sistema de Gestão de Promoções Prado

## Visão Geral

Sistema web para gerenciamento de promoções internas da rede Prado Supermercados.

Objetivo:
substituir a planilha manual por um sistema moderno onde:

- compradores cadastram promoções
- gestor aprova/lanca promoções
- promoções ativas ficam disponíveis para consulta
- promoções vencidas vão automaticamente para histórico
- PDFs e imagens podem ser gerados para envio no WhatsApp

---

# Stack Tecnológica

## Frontend

- React
- Vite
- TypeScript
- TailwindCSS
- shadcn/ui
- TanStack Table
- React Hook Form
- Zod

## Backend

- Cloudflare Workers
- Hono Framework

## Banco

- Cloudflare D1

## Deploy

- Cloudflare Pages
- Cloudflare Workers

---

# Usuários

## Comprador

Pode:
- criar promoções
- editar promoções pendentes
- visualizar promoções criadas

Não pode:
- lançar promoções
- excluir histórico

---

## Administrador/Gestor

Pode:
- aprovar/lancar promoções
- editar qualquer promoção
- excluir promoções
- gerar PDF
- visualizar histórico

---

# Fluxo Principal

```txt
CADASTRO
   ↓
PENDENTE
   ↓ Aprovar/Lançar
ATIVA
   ↓ Data fim expirada
ENCERRADA