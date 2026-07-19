# TOOLS → ENDPOINTS — Mapa das 48 @Tool para a API REST

> Cada "tool" dos agentes n8n é um nó **HTTP Request Tool** apontando para
> `http://backend:8080/api/...` (rede docker interna), com o header
> `Authorization: Bearer {{ $json.jwt }}`. O backend valida como qualquer request
> (JwtFilter → TenantFilter → TenantContext → `@Requer`), preservando RBAC, `DtoValidator`,
> multi-tenancy e auditoria — **sem reimplementar nada no n8n**.
>
> Mapa gerado da varredura dos controllers em
> `core4erp/src/main/java/br/com/core4erp/**/controller/*.java` e das 5 classes de @Tool
> (`chat/tools/`). Base URL de todas as rotas: `http://backend:8080`.

## Convenções desta tabela

- **`{id}` vem de uma consulta prévia.** Muitas @Tool operam **por nome** (ex.: "excluir o cartão
  Nubank"). A API REST opera por **ID**. Portanto essas tools viram **2 nós** no n8n:
  1. GET de listagem → resolver o ID pelo nome (o AI Agent faz o match);
  2. PUT/DELETE `/{id}`.
  Marcadas como **`resolver ID → …`**.
- **⚠️ endpoint a confirmar** = não há endpoint REST espelho óbvio; decidir na Fase 3 (criar
  endpoint, usar loop, ou aproximar por outro).
- Todos os GET de listagem já filtram por `empresaId` no backend (via TenantContext) — o isolamento
  é automático desde que o JWT correto seja repassado.

---

## Agente CONSULTOR (WF-CONSULTA) — somente leitura

| # | @Tool | Classe origem | Método + Path REST | Permissão (`@Requer`) | Obs. |
|---|---|---|---|---|---|
| 1 | `consultarDashboard` | ConsultaTools | `GET /api/dashboard` | DASHBOARD_VISUALIZAR | Aceita `mesInicio/anoInicio/mesFim/anoFim` opcionais. |
| 2 | `consultarContasCorrentes` | ConsultaTools | `GET /api/contas-correntes` | CONTA_CORRENTE_VISUALIZAR | |
| 3 | `consultarCategorias` | ConsultaTools | `GET /api/categorias` | CATEGORIA_VISUALIZAR | Árvore: `GET /api/categorias/arvore`. |
| 4 | `consultarCartoes` | ConsultaTools | `GET /api/cartoes` | CARTAO_VISUALIZAR | |
| 5 | `consultarInvestimentos` | ConsultaTools | `GET /api/investimentos` | INVESTIMENTO_VISUALIZAR | |
| 6 | `consultarNotificacoes` | ConsultaTools | `GET /api/notificacoes` | — (sem @Requer) | Não lidas. |
| 7 | `consultarAssinaturas` | ConsultaTools | `GET /api/assinaturas` | ASSINATURA_VISUALIZAR | Ativas: `GET /api/assinaturas/ativas`. |
| 8 | `consultarParceiros` | ConsultaTools | `GET /api/parceiros` | PARCEIRO_VISUALIZAR | |
| 9 | `consultarContas` | LancamentoTools | `GET /api/contas?tipo={PAGAR\|RECEBER}&status={...}` | CONTA_VISUALIZAR | Filtros opcionais na query string. |
| 10 | `consultarLancamentosCartao` | GestaoFinanceiraTools | `resolver ID do cartão → GET /api/cartoes/{id}/lancamentos?mes=&ano=` | CARTAO_VISUALIZAR | Cartão por nome → resolver ID via GET /api/cartoes. |
| 11 | `consultarGastosCartao` | GestaoFinanceiraTools | `GET /api/cartoes/dashboard/resumo?mesInicio=&anoInicio=&mesFim=&anoFim=` | CARTAO_VISUALIZAR | |
| 12 | `consultarGastosPorContaCorrente` | GestaoFinanceiraTools | ⚠️ endpoint a confirmar — aproximar por `GET /api/dashboard/saldo-detalhado` | DASHBOARD_CARTAO_VISUALIZAR | Não há endpoint espelho direto; validar na Fase 3. |
| 13 | `consultarTiposInvestimento` | GestaoFinanceiraTools | `GET /api/investimentos/tipos` | INVESTIMENTO_TIPO_GERENCIAR | |

> As tools 9–13 estão fisicamente em outras classes Java, mas semanticamente são **leitura** e vão
> para o CONSULTOR conforme §4.2 do plano. As de leitura mínima usadas pelo EXECUTOR/CADASTRADOR para
> resolver IDs (consultarContas, consultarCategorias, consultarParceiros, consultarCartoes) são as
> **mesmas** tools GET — reutilizadas dentro daqueles workflows.

---

## Agente EXECUTOR (WF-EXEC) — escrita financeira (com Revisor)

| # | @Tool | Classe origem | Método + Path REST | Permissão | Obs. |
|---|---|---|---|---|---|
| 14 | `registrarConta` | LancamentoTools | `POST /api/contas` | CONTA_CRIAR | Suporta parcelas. Categoria null → classificação IA (nó do WF, G2). |
| 15 | `atualizarConta` | LancamentoTools | `PUT /api/contas/{id}` | CONTA_EDITAR | Só PENDENTE/VENCIDA são editáveis. |
| 16 | `excluirConta` | LancamentoTools | `DELETE /api/contas/{id}` | CONTA_DELETAR | |
| 17 | `baixarConta` | LancamentoTools | `PATCH /api/contas/{id}/baixa` | CONTA_BAIXAR | ⚠️ **Divergência do plano**: plano A.1 citou `POST /baixar`; o real é **`PATCH /api/contas/{id}/baixa`**. Body: contaCorrenteId, dataPagamento, juros, multa. |
| 18 | `estornarConta` | LancamentoTools | `DELETE /api/contas/{id}/baixa` | CONTA_ESTORNAR | Estorno = remover a baixa. |
| 19 | `registrarLancamentoCartao` | LancamentoTools | `resolver ID cartão (recebe cartaoId) → POST /api/cartoes/{id}/lancamentos` | CARTAO_LANCAR | Parceiro OBRIGATÓRIO; tipo SAIDA/ENTRADA. |
| 20 | `atualizarLancamentoCartao` | GestaoFinanceiraTools | `resolver ID cartão → PUT /api/cartoes/{id}/lancamentos/{lancamentoId}` | CARTAO_LANCAR | Imutável se fatura FECHADA. |
| 21 | `excluirLancamentoCartao` | GestaoFinanceiraTools | `resolver ID cartão → DELETE /api/cartoes/{id}/lancamentos/{lancamentoId}` | CARTAO_LANCAR | |
| 22 | `transferirEntreContas` | LancamentoTools | `POST /api/contas-correntes/transferir` | CONTA_CORRENTE_TRANSFERIR | Alto valor → confirmar com usuário (§4.3 regra 4). |
| 23 | `fecharFatura` | GestaoFinanceiraTools | `resolver ID cartão → POST /api/cartoes/{id}/fechar-fatura` (body: mes, ano) | CARTAO_FECHAR_FATURA | Total líquido ≤ 0 não fecha. |
| 24 | `registrarTransacaoInvestimento` | LancamentoTools | `POST /api/investimentos/{contaInvestimentoId}/transacoes` | INVESTIMENTO_CRIAR | APORTE/RESGATE/RENDIMENTO. |

**Leitura mínima reutilizada pelo EXECUTOR** (para resolver IDs antes de escrever): tools #3, #4, #8, #9.

---

## Agente CADASTRADOR (WF-CADASTRO) — cadastros-base + CNPJ

| # | @Tool | Classe origem | Método + Path REST | Permissão | Obs. |
|---|---|---|---|---|---|
| 25 | `registrarParceiro` | CadastroTools | `POST /api/parceiros` | PARCEIRO_CRIAR | CPF/CNPJ obrigatório. |
| 26 | `registrarParceiros` (lote) | CadastroTools | ⚠️ sem endpoint em lote → **loop** `POST /api/parceiros` (nó Split/Loop) | PARCEIRO_CRIAR | Backend não tem POST em lote. |
| 27 | `atualizarParceiro` | GestaoFinanceiraTools | `resolver ID → PUT /api/parceiros/{id}` | PARCEIRO_EDITAR | Por nome. |
| 28 | `atualizarTipoParceiro` | CadastroTools | `resolver ID (recebe parceiroId) → PUT /api/parceiros/{id}` | PARCEIRO_EDITAR | Só muda o tipo. |
| 29 | `excluirParceiro` | GestaoFinanceiraTools | `resolver ID → DELETE /api/parceiros/{id}` | PARCEIRO_DELETAR | Soft delete se referenciado. |
| 30 | `registrarCategoria` | CadastroTools | `POST /api/categorias` | CATEGORIA_CRIAR | Subcategoria: resolver categoria-pai. |
| 31 | `registrarCategorias` (lote) | CadastroTools | ⚠️ sem endpoint em lote → **loop** `POST /api/categorias` | CATEGORIA_CRIAR | |
| 32 | `atualizarCategoria` | GestaoFinanceiraTools | `resolver ID → PUT /api/categorias/{id}` | CATEGORIA_EDITAR | |
| 33 | `excluirCategoria` | GestaoFinanceiraTools | `resolver ID → DELETE /api/categorias/{id}` | CATEGORIA_DELETAR | |
| 34 | `consultarCnpj` | CadastroTools | `GET https://brasilapi.com.br/api/cnpj/v1/{cnpj}` (externa) **ou** proxy backend `GET /api/parceiros/cnpj/{cnpj}` | PARCEIRO_VISUALIZAR (no proxy) | Preferir o proxy backend (já existe e é auditado); BrasilAPI direta como plano B. |
| 35 | `registrarContaCorrente` | GestaoFinanceiraTools | `POST /api/contas-correntes` | CONTA_CORRENTE_CRIAR | |
| 36 | `atualizarContaCorrente` | GestaoFinanceiraTools | `resolver ID → PUT /api/contas-correntes/{id}` | CONTA_CORRENTE_EDITAR | Por nome. |
| 37 | `excluirContaCorrente` | GestaoFinanceiraTools | `resolver ID → DELETE /api/contas-correntes/{id}` | CONTA_CORRENTE_DELETAR | Bloqueado se houver transferência/conciliação. |
| 38 | `registrarCartaoCredito` | GestaoFinanceiraTools | `POST /api/cartoes` | CARTAO_CRIAR | Conta corrente vinculada por nome → resolver ID. |
| 39 | `atualizarCartaoCredito` | GestaoFinanceiraTools | `resolver ID → PUT /api/cartoes/{id}` | CARTAO_EDITAR | |
| 40 | `excluirCartaoCredito` | GestaoFinanceiraTools | `resolver ID → DELETE /api/cartoes/{id}` | CARTAO_DELETAR | Bloqueado se fatura em aberto. |
| 41 | `registrarAssinatura` | GestaoFinanceiraTools | `POST /api/assinaturas` | ASSINATURA_CRIAR | Categoria/parceiro/cartão por nome → resolver ID. |
| 42 | `atualizarAssinatura` | GestaoFinanceiraTools | `resolver ID → PUT /api/assinaturas/{id}` | ASSINATURA_EDITAR | |
| 43 | `excluirAssinatura` | GestaoFinanceiraTools | `resolver ID → DELETE /api/assinaturas/{id}` | ASSINATURA_DELETAR | |
| 44 | `registrarTipoInvestimento` | GestaoFinanceiraTools | `POST /api/investimentos/tipos` | INVESTIMENTO_TIPO_GERENCIAR | |
| 45 | `registrarInvestimento` | GestaoFinanceiraTools | `POST /api/investimentos` | INVESTIMENTO_CRIAR | Cria carteira (tipo por nome → resolver ID). |
| 46 | `atualizarInvestimento` | GestaoFinanceiraTools | `resolver ID → PUT /api/investimentos/{id}` | INVESTIMENTO_EDITAR | |
| 47 | `excluirInvestimento` | GestaoFinanceiraTools | `resolver ID → DELETE /api/investimentos/{id}` | INVESTIMENTO_DELETAR | |

> **Regra de dependência de leitura:** o CADASTRADOR reusa tools GET (#3 categorias, #8 parceiros,
> #4 cartões, #2 contas correntes, #13 tipos) para "verificar se já existe" (anti-duplicação, §4.5 regra 2)
> e para resolver os IDs por nome.

---

## Agente ANALISTA (WF-ANALISTA) — RAG + relatórios + agregações

| # | @Tool | Classe origem | Método + Path REST | Permissão | Obs. |
|---|---|---|---|---|---|
| 48 | `gerarRelatorioExcel` | RelatorioTools | `GET /api/relatorios/{tipo}?dataInicio=&dataFim=` (retorna `.xlsx`) | RELATORIO_*_EXPORTAR | Tool é genérica (dataInicio/dataFim); `{tipo}` ∈ fluxo-caixa, contas-abertas, extrato, dre, investimentos, cartoes, posicao-financeira, assinaturas. O agente escolhe o tipo pela intenção. |
| — | Retrieval RAG | (não é HTTP tool) | **Nó Qdrant Vector Store** — retrieval com **filtro `empresaId`** | — | Coleção `core4erp_rag`. Embeddings `text-embedding-3-small`. **Filtro empresaId OBRIGATÓRIO** (regra de ouro §3.3). |
| — | Agregações | ConsultaTools/Relatorio | `GET /api/dashboard`, `GET /api/relatorios/dre/dados`, `/fluxo-caixa/dados`, `/api/cartoes/dashboard/resumo` (JSON) | vários RELATORIO_*_VISUALIZAR | Números atuais **sempre** de tool nesta resposta; RAG só para contexto histórico/documentos. |

Endpoints de relatório disponíveis (JSON `.../dados` e export `.xlsx`), todos sob `/api/relatorios`:

```
GET /api/relatorios/fluxo-caixa/dados        RELATORIO_FLUXO_CAIXA_VISUALIZAR
GET /api/relatorios/fluxo-caixa              RELATORIO_FLUXO_CAIXA_EXPORTAR   (xlsx)
GET /api/relatorios/contas-abertas/dados     RELATORIO_CONTAS_ABERTAS_VISUALIZAR
GET /api/relatorios/contas-abertas           RELATORIO_CONTAS_ABERTAS_EXPORTAR (xlsx)
GET /api/relatorios/extrato/dados            RELATORIO_EXTRATO_VISUALIZAR
GET /api/relatorios/extrato                  RELATORIO_EXTRATO_EXPORTAR       (xlsx)
GET /api/relatorios/dre/dados                RELATORIO_DRE_VISUALIZAR
GET /api/relatorios/dre                      RELATORIO_DRE_EXPORTAR           (xlsx)
GET /api/relatorios/investimentos/dados      RELATORIO_INVESTIMENTOS_VISUALIZAR
GET /api/relatorios/investimentos            RELATORIO_INVESTIMENTOS_EXPORTAR (xlsx)
GET /api/relatorios/cartoes/dados            RELATORIO_CARTOES_VISUALIZAR
GET /api/relatorios/cartoes                  RELATORIO_CARTOES_EXPORTAR       (xlsx)
GET /api/relatorios/posicao-financeira/dados RELATORIO_POSICAO_FINANCEIRA_VISUALIZAR
GET /api/relatorios/posicao-financeira       RELATORIO_POSICAO_FINANCEIRA_EXPORTAR (xlsx)
GET /api/relatorios/assinaturas/dados        RELATORIO_ASSINATURAS_VISUALIZAR
GET /api/relatorios/assinaturas              RELATORIO_ASSINATURAS_EXPORTAR   (xlsx)
```

---

## Resumo dos pontos de atenção (⚠️)

1. **`baixarConta`** — usar `PATCH /api/contas/{id}/baixa` (não `POST /baixar` como no rascunho do plano).
2. **`estornarConta`** — é `DELETE /api/contas/{id}/baixa`.
3. **Tools em lote** (`registrarParceiros`, `registrarCategorias`) — não há endpoint batch; implementar
   com nó Split/Loop chamando o POST unitário N vezes.
4. **`consultarGastosPorContaCorrente`** — sem endpoint espelho direto; aproximar por
   `GET /api/dashboard/saldo-detalhado` e validar na Fase 3, ou criar endpoint dedicado.
5. **Tools "por nome"** (a maioria de GestaoFinanceiraTools) — exigem passo de **resolver ID**
   (GET listagem → match por nome pelo agente → PUT/DELETE `/{id}`).
6. **`gerarRelatorioExcel`** — a tool Java é genérica; no n8n o agente precisa escolher qual dos 8
   endpoints de export chamar conforme a intenção do usuário.
7. **`consultarCnpj`** — preferir o proxy backend `GET /api/parceiros/cnpj/{cnpj}` (auditado) à
   chamada direta na BrasilAPI.
8. **WF-EVENTOS / notificação** — o plano cita `POST /api/notificacoes`, mas o
   `NotificacaoController` só expõe `GET`, `PATCH /{id}/lida` e `POST /sincronizar`. **Não há POST de
   criação de notificação** — ver nota no `evento-workflow.json` e resolver na Fase 2.4 (criar
   endpoint de criação ou usar `POST /api/notificacoes/sincronizar`).
