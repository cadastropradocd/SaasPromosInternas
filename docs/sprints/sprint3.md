# Sprint 3 — Correção de Deploy e Estabilização Produção

## Objetivo da Sprint

Corrigir os problemas que impedem o sistema **Promos Prado** de funcionar corretamente em produção na Cloudflare.

Foco:

- corrigir deploy do frontend no Cloudflare Pages
- configurar URL da API em produção
- corrigir configuração do Cloudflare Worker
- configurar Cloudflare D1 remoto
- validar rotas do React em produção
- criar checklist de smoke test pós-deploy

Duração estimada:
1 semana

---

# Problema Identificado

Ao acessar:

```txt
https://saaspromosinternas.pages.dev/