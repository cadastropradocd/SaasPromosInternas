# PLANO DE CORREÇÕES - SAASPROMOSINTERNAS

## 🎯 OBJETIVO
Estabilizar produção, reduzir dívida técnica crítica e estabelecer fundamentos para escala sustentável.

## ⚠️ RESTRIÇÕES DO PLANO
- Zero modificações diretas no código (modo plano ativo)
- Foco em sequencia lógica e dependências
- Priorização por impacto/risco
- Estimativas realistas para equipe de 1-2 devs

---

## 🚨 FASE 1: ESTABILIZAÇÃO DE PRODUÇÃO (0-7 DIAS)
*Objetivo: Eliminar falhas em produção e riscos operacionais imediatos*

| Item | Ação | Justificativa | Esforço | Dependências |
|------|------|---------------|---------|--------------|
| 1.1 | Corrigir fallback SPA no Cloudflare Pages | Erro `chrome-error://chromewebdata` indica configuración incorrecta de `_worker.js` ou `wrangler.toml` | 2h | Acesso ao projeto Cloudflare |
| 1.2 | Implementar logout real em interceptador 401 | Token inválido mantém app quebrado sem redirecionamento | 1h | Nenhuma |
| 1.3 | Adicionar boundary de erro global no React | Prevenir que erros JS quebrem hidratação silenciosamente | 1h | Nenhuma |
| 1.4 | Configurar timeout + retry básico em `apiFetch` | Falhas de rede causam experiência ruim irreversível | 2h | Nenhuma |
| 1.5 | Adicionar headers de segurança básicos | Proteção contra XSS, clickjacking e MIME sniffing | 1h | Nenhuma |

**Critério de sucesso**: 
- Aplicação estável em produção por 48h consecutivas
- Nenhum erro 5xx não tratado
- Usuários não precisam recarregar após sessão expirada

---

## 🏗️ FASE 2: MODULARIZAÇÃO BACKEND INICIAL (1-3 SEMANAS)
*Objetivo: Quebrar monolito crítico começando por módulo de autenticação*

| Item | Ação | Justificativa | Esforço | Dependências |
|------|------|---------------|---------|--------------|
| 2.1 | Criar estrutura de pastas: `src/services/`, `src/repositories/`, `src/controllers/` | Preparar groundwork para separação de camadas | 1h | Nenhuma |
| 2.2 | Extrair AuthService (regras de negócio de auth) | Primeiro módulo independente para validar abordagem | 4h | 2.1 |
| 2.3 | Extrair AuthRepository (acesso a D1) | Isolarqueries SQL de auth | 3h | 2.1, 2.2 |
| 2.4 | Migrar rotas de auth para usar novo padrão | Provar valor da modularização em produção | 3h | 2.2, 2.3 |
| 2.5 | Implementar validação Zod para login/register | Substituir validação frágil por schema-driven | 2h | Nenhuma |
| 2.6 | Adicionar rate limiting em `/auth/login` | Mitigar risco de brute force identificado | 2h | Nenhuma |

**Critério de sucesso**: 
- Autenticação 100% funcional com nova arquitetura
- Zero regressão em funcionalidades de auth
- Estrutura pronta para replicar em outros módulos

---

## 🔧 FASE 3: FUNDAMENTOS DE QUALIDADE (3-6 SEMANAS)
*Objetivo: Estabilizar qualidade de código e reduzir risco de regressão*

| Item | Ação | Justificativa | Esforço | Dependências |
|------|------|---------------|---------|--------------|
| 3.1 | Aplicar padrão Service/Repository a Promotions | Módulo de maior valor e complexidade | 6h | Fase 2 concluída |
| 3.2 | Implementar transações para operações multi-step | Prevenir dados órfãos em promoção + stores + history | 3h | 3.1 |
| 3.3 | Padronizar validação com Zod em 80% dos endpoints | Eliminar validação ad-hoc frágil | 4h | Nenhuma |
| 3.4 | Adicionar logging estruturado com contexto | Preparar para observabilidade em produção | 2h | Nenhuma |
| 3.5 | Implementar métricas básicas (latency, error rates) | Base para alertas e capacidade planning | 2h | 3.4 |
| 3.6 | Criar security logger para eventos críticos | Ransquear tentativas de invasão e acessos negados | 2h | 3.4 |

**Critério de sucesso**: 
- Cobertura de testes unitários >70% em serviços novos
- Zero incidentes de dados inconsistentes
- MTTR (Mean Time To Recovery) <15min para incidentes

---

## 📈 FASE 4: ESCALABILIDADE E OBSERVABILIDADE (6-12 SEMANAS)
*Objetivo: Preparar para crescimento de equipe e volume*

| Item | Ação | Justificativa | Esforço | Dependências |
|------|------|---------------|---------|--------------|
| 4.1 | Completar modularização de Stores e Categories | Aplicar padrão aprendido a todos os módulos | 8h | Fase 3 |
| 4.2 | Implementar cache de leitura em D1 para consultas frequentes | Reduzir carga e melhorar resposta do dashboard | 3h | Nenhuma |
| 4.3 | Adicionar tracing distribuído (OpenTelemetry) | Visibility em chamadas cross-service | 4h | Nenhuma |
| 4.4 | Criar dashboard de métricas operacionais | Tomada de decisão baseada em dados | 3h | 4.3 |
| 4.5 | Implementar estratégia de backup e teste de restore | Preparar para cenários de desastre | 2h | Nenhuma |
| 4.6 | Documentar arquitetura e onboarding guide | Reduzir tempo de integração de novos devs | 4h | Todas as fases anteriores |

**Critério de sucesso**: 
- Sistema suporta 2x carga atual sem degradação
- Novo dev produtivo em <2 dias
- SLA de disponibilidade >99.5% mensal

---

## 🛡️ FASE 5: SEGURANÇA AVANÇADA (OPCIONAL, CONFORME NECESSIDADE)
*Objetivo: Elevar postura de segurança além do básico*

| Item | Ação | Justificativa | Esforço | Dependências |
|------|------|---------------|---------|--------------|
| 5.1 | Implementar rate limiting sofisticado (por IP + conta) | Proteção avançada contra credencia stuffing | 3h | Fase 2.6 |
| 5.2 | Adicionar detecção de anomalias em acessos | Identificar padrões de acesso suspeitos | 4h | Fase 3.4, 3.5 |
| 5.3 | Implementar rota de refresh token com rotação | Melhorar segurança de sessões longas | 2h | Fase 2.2 |
| 5.4 | Realizar pentest básico focado em auth e validação | Validar eficácia das medidas de segurança | 8h (external) | Todas as fases |
| 5.5 | Implementar criptografia de campos sensíveis se necessário | Proteção extra para dados PII | 3h | Avaliação legal |

---

## 📅 CRONOGRAMA SUGERIDO
```
Semana 1: Fase 1 (estabilização produção) + início Fase 2.1-2.3
Semana 2: Concluir Fase 2 (auth modularizado) + iniciar Fase 3.1
Semana 3: Fase 3.1-3.3 (promotions + transações + zod)
Semana 4: Fase 3.4-3.6 (logging, métricas, security)
Semana 5-6: Fase 4.1-4.2 (completar modularização + cache)
Semana 7-8: Fase 4.3-4.4 (tracing + dashboard)
Semana 9-12: Fase 4.5-4.6 + revisão e ajustes
```

## 🎯 MARCOS DE SUCESSO
- **Marco 1 (Fim Semana 2)**: Produção estável + auth modularizado funcionando
- **Marco 2 (Fim Semana 4)**: Qualidade de código elevada (testes, logging, validação)
- **Marco 3 (Fim Semana 8)**: Sistema observável e pronto para escala de equipe
- **Marco 4 (Fim Semana 12)**: Arquitetura madura com documentação e processos

## ⚠️ RISCOS E MITIGAÇÕES
| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Subestimar esforço de refactor | Médio | Alto | Começar com módulo pequeno (auth) para validar abordagem |
| Regressão durante modularização | Médio | Médio | Implementar testes de contrato antes de mudar cada módulo |
| Resistência à mudança de padrões | Baixo | Médio | Demonstrar valor rápido com auth antes de expandir |
| Dependência excessiva de uma pessoa | Médio | Alto | Pair programming durante transferência de conhecimento |
| Delay em correções de produção | Baixo | Crítico | Timebox estrito para Fase 1 (máximo 3 dias úteis) |

## 📊 MÉTRICAS DE ACOMPANHAMENTO
- **Lead time for changes**: De commit à produção (meta: <1h após Semana 4)
- **Deployment frequency**: Deploys por semana (meta: ≥2 após Semana 2)
- **Change fail rate**: % de deploys que causam incidente (meta: <5% após Semana 4)
- **MTTR**: Tempo médio de recuperação (meta: <30min após Semana 4)
- **Code churn**: % de código reescrito (meta: <15% após Semana 3)

## 💡 PRINCÍPIOS ORIENTADORES
1. **Primeiro estabilize, depois melhore**: Nada de novas features até Fase 1 completa
2. **Valor incremental**: Cada entregável deve funcionar independentemente
3. **Provar antes de escalar**: Validar abordagem em auth antes de aplicar a outros módulos
4. **Não perfeccionismo progressivo**: Buscar "bom o suficiente" que permita avançar
5. **Observabilidade como feature**: Logging e métricas são tão importantes quanto funcionalidade