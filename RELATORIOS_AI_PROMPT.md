# Core 4 ERP — AI Prompt: Sistema de Relatórios (Backend + Frontend)

> **Versão:** 1.0 | **Atualizado em:** 2025  
> **Propósito:** Guia completo para que o assistente de IA (C4 Assistant) gerencie, expanda e mantenha o sistema de relatórios financeiros do Core 4 ERP — tanto no backend (Spring Boot / Java) quanto no frontend (React / Vite).

---

## 1. Contexto do Sistema

### 1.1 Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Backend | Spring Boot 3.3, Java 17, Spring Data JPA, PostgreSQL |
| IA/Chat | Spring AI com Google Gemini 2.0 Flash |
| Geração Excel | Apache POI 5.3.0 |
| Frontend | React 19, Vite, Tailwind CSS v4, Recharts 3 |
| Autenticação | JWT (HMAC-SHA256, HttpOnly Cookie) |
| Multi-tenancy | Coluna `usuario_id` em todas as entidades |

### 1.2 Módulos de Dados Disponíveis

```
tb_usuario          → Usuários do sistema
tb_categoria        → Categorias de receita/despesa (com ícone)
tb_parceiro         → Clientes e fornecedores
tb_conta_corrente   → Contas bancárias com saldo
tb_conta            → Contas a pagar/receber (status: PENDENTE, ATRASADO, PAGO, RECEBIDO)
tb_conta_baixada    → Registro de pagamentos efetuados (juros, multa, valor final)
tb_cartao_credito   → Cartões com limite e dias de fechamento/vencimento
tb_lancamento_cartao → Lançamentos por fatura
tb_fatura_cartao    → Faturas (ABERTA / FECHADA)
tb_conta_investimento → Carteiras de investimento (RENDA_FIXA, RENDA_VARIAVEL, etc.)
tb_transacao_investimento → Aportes, Resgates e Rendimentos
tb_notificacao      → Alertas de vencimento e fatura
```

---

## 2. Infraestrutura de Relatórios Atual

### 2.1 Backend — `RelatorioExcelService`

**Localização:** `core4erp/src/main/java/br/com/core4erp/chat/tools/relatorio/RelatorioExcelService.java`

**Responsabilidades atuais:**
- Gerar arquivos `.xlsx` com Apache POI
- Armazenar temporariamente em `${chat.relatorios.dir}` (temp do sistema)
- Limpar arquivos expirados automaticamente a cada hora (`@Scheduled`)
- Servir downloads via endpoint GET protegido: `/api/chat/relatorios/{fileName}`

**Configuração (`application.properties`):**
```properties
chat.relatorios.dir=${java.io.tmpdir}/core4erp-relatorios
chat.relatorios.ttl-minutes=60
```

**Método principal atual:**
```java
public String gerarRelatorioDespesas(LocalDate inicio, LocalDate fim)
```
Retorna o nome do arquivo gerado (UUID + `.xlsx`).

**Segurança de download:**
```java
if (fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
    throw new IllegalArgumentException("Nome de arquivo inválido");
}
```

### 2.2 Backend — `RelatorioTools` (Spring AI Tool)

**Localização:** `core4erp/src/main/java/br/com/core4erp/chat/tools/relatorio/RelatorioTools.java`

**Tool exposta ao LLM:**
```java
@Tool(description = "Gera um relatório financeiro em formato Excel (.xlsx)...")
public Map<String, String> gerarRelatorioExcel(LocalDate dataInicio, LocalDate dataFim)
```
Retorna `{ downloadUrl, mensagem }`.

### 2.3 Frontend — `Reports.jsx`

**Localização:** `front-end/src/views/Reports.jsx`

**Estado atual:** Interface de placeholder com cards estáticos. Não conecta à API real ainda.

### 2.4 Frontend — `ChatSidebar.jsx` + `RelatorioToolUI.jsx`

O chat já integra o download de relatórios via IA através do componente `DownloadToolUI`, que renderiza um botão de download ao detectar uma URL `/api/chat/relatorios/*.xlsx`.

---

## 3. Regras de Negócio para Relatórios

### 3.1 Isolamento de Dados (CRÍTICO)

**Toda query de relatório DEVE filtrar por `usuarioId`** obtido via `SecurityContextUtils.getUsuarioId()`. Nunca omitir este filtro.

```java
// Exemplo correto
Long uid = securityCtx.getUsuarioId();
contaRepository.findAllByUsuarioId(uid, pageable);

// ERRADO — nunca faça
contaRepository.findAll(); // expõe dados de todos os usuários
```

### 3.2 Status de Contas

| Status | Descrição |
|--------|-----------|
| `PENDENTE` | Conta criada, ainda não vencida |
| `ATRASADO` | Passou do vencimento sem pagamento |
| `PAGO` | Conta a pagar quitada |
| `RECEBIDO` | Conta a receber recebida |

### 3.3 Tipos de Conta

| Tipo | Direção |
|------|---------|
| `PAGAR` | Saída de caixa (despesa) |
| `RECEBER` | Entrada de caixa (receita) |

### 3.4 Tipos de Transação de Investimento

| Tipo | Efeito no Saldo |
|------|----------------|
| `APORTE` | Aumenta `saldoAtual`, debita conta corrente |
| `RESGATE` | Diminui `saldoAtual`, credita conta corrente |
| `RENDIMENTO` | Aumenta `saldoAtual` (sem movimentação de conta corrente) |

---

## 4. Relatórios a Implementar

### 4.1 Prioridade Alta

#### R01 — Fluxo de Caixa Realizado
**Descrição:** Entradas recebidas vs. saídas pagas por período, agrupadas por mês.  
**Tabela fonte:** `tb_conta` (status PAGO e RECEBIDO)  
**Colunas:** Mês/Ano, Receitas Recebidas, Despesas Pagas, Saldo do Período, Saldo Acumulado  
**Filtros:** `data_vencimento` BETWEEN `inicio` AND `fim`, `usuario_id`

```sql
SELECT
  EXTRACT(YEAR FROM data_vencimento) AS ano,
  EXTRACT(MONTH FROM data_vencimento) AS mes,
  SUM(CASE WHEN tipo = 'RECEBER' AND status = 'RECEBIDO' THEN valor_original ELSE 0 END) AS receitas,
  SUM(CASE WHEN tipo = 'PAGAR'   AND status = 'PAGO'     THEN valor_original ELSE 0 END) AS despesas
FROM tb_conta
WHERE usuario_id = :uid
  AND data_vencimento BETWEEN :inicio AND :fim
GROUP BY 1, 2
ORDER BY 1, 2;
```

#### R02 — Contas a Pagar/Receber (Posição)
**Descrição:** Lista todas as contas com status PENDENTE e ATRASADO.  
**Colunas:** Nº Doc, Descrição, Parceiro, Categoria, Vencimento, Dias em Atraso, Valor, Status  
**Destaque:** Linha vermelha para status ATRASADO.

#### R03 — Extrato por Conta Corrente
**Descrição:** Movimentações de uma conta corrente (baixas de contas a pagar/receber e transferências) em um período.  
**Tabela fonte:** `tb_conta_baixada` JOIN `tb_conta` JOIN `tb_conta_corrente`  
**Colunas:** Data Pagamento, Descrição, Tipo (E/S), Valor Final, Saldo Parcial

#### R04 — DRE Simplificado (Resultado)
**Descrição:** Receitas × Despesas por categoria no período.  
**Colunas:** Categoria, Total Receitas, Total Despesas, Resultado  
**Agrupamento:** Por categoria, ordenado pelo maior resultado.

### 4.2 Prioridade Média

#### R05 — Posição de Cartões de Crédito
**Descrição:** Lançamentos em aberto por cartão e fatura.  
**Colunas:** Cartão, Fatura (Mês/Ano), Status Fatura, Lançamento, Categoria, Valor

#### R06 — Extrato de Investimentos
**Descrição:** Histórico de transações por carteira de investimento.  
**Colunas:** Carteira, Tipo, Valor, Data, Saldo Após

#### R07 — Relatório de Parceiros (Aging)
**Descrição:** Contas a receber agrupadas por cliente, com aging (0-30d, 31-60d, 61-90d, +90d).  
**Filtro:** `tipo = 'RECEBER'`, `status IN ('PENDENTE', 'ATRASADO')`

### 4.3 Prioridade Baixa

#### R08 — Projeção de Caixa (90 dias)
**Descrição:** Contas PENDENTES e ATRASADAS ordenadas por vencimento, com saldo projetado dia a dia.

#### R09 — Conciliação Bancária
**Descrição:** Comparação entre `tb_conta_baixada` e lançamentos de extrato importado (a ser desenvolvido).

---

## 5. Padrão de Implementação Backend

### 5.1 Novo Método em `RelatorioExcelService`

Cada novo relatório deve seguir este padrão:

```java
/**
 * Gera o relatório [NOME] em Excel.
 * Filtrado pelo usuário autenticado via SecurityContextUtils.
 *
 * @param inicio  Data inicial do período (inclusive)
 * @param fim     Data final do período (inclusive)
 * @return        Nome do arquivo gerado (UUID.xlsx)
 */
public String gerarRelatorio[Nome](LocalDate inicio, LocalDate fim) {
    Long uid = securityCtx.getUsuarioId();

    // 1. Buscar dados filtrados por uid e período
    List<MinhaEntidade> dados = minhaRepository.findByUsuarioIdAndPeriodo(uid, inicio, fim);

    // 2. Gerar nome único
    String fileName = UUID.randomUUID() + ".xlsx";
    Path filePath = Path.of(relatoriosDir, fileName);

    // 3. Construir workbook com Apache POI
    try (Workbook wb = new XSSFWorkbook();
         FileOutputStream out = new FileOutputStream(filePath.toFile())) {

        Sheet sheet = wb.createSheet("Relatório");

        // 3a. Cabeçalho com estilo bold
        CellStyle headerStyle = criarEstiloHeader(wb);
        Row header = sheet.createRow(0);
        String[] colunas = {"Col1", "Col2", "Col3"};
        for (int i = 0; i < colunas.length; i++) {
            Cell cell = header.createCell(i);
            cell.setCellValue(colunas[i]);
            cell.setCellStyle(headerStyle);
        }

        // 3b. Linhas de dados
        int rowNum = 1;
        for (MinhaEntidade d : dados) {
            Row row = sheet.createRow(rowNum++);
            row.createCell(0).setCellValue(d.getCampo1());
            row.createCell(1).setCellValue(d.getValor().doubleValue());
            // ...
        }

        // 3c. Auto-size colunas
        for (int i = 0; i < colunas.length; i++) {
            sheet.autoSizeColumn(i);
        }

        wb.write(out);
    } catch (IOException e) {
        throw new RuntimeException("Erro ao gerar relatório Excel", e);
    }

    return fileName;
}

// Helper: estilo de cabeçalho reutilizável
private CellStyle criarEstiloHeader(Workbook wb) {
    CellStyle style = wb.createCellStyle();
    Font font = wb.createFont();
    font.setBold(true);
    style.setFont(font);
    style.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
    style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
    return style;
}
```

### 5.2 Novo Tool em `RelatorioTools`

```java
@Tool(description = """
    [DESCRIÇÃO COMPLETA DO RELATÓRIO para o LLM entender quando usar].
    Confirme o período com o usuário antes de gerar.
    """)
public Map<String, String> gerarRelatorio[Nome](
        @ToolParam(description = "Data de início no formato YYYY-MM-DD") LocalDate dataInicio,
        @ToolParam(description = "Data de fim no formato YYYY-MM-DD") LocalDate dataFim) {
    String fileName = excelService.gerarRelatorio[Nome](dataInicio, dataFim);
    return Map.of(
            "downloadUrl", "/api/chat/relatorios/" + fileName,
            "mensagem", "Relatório [nome] gerado. Disponível para download."
    );
}
```

### 5.3 Query JPA Recomendada (Repositório)

Para relatórios complexos, adicionar método no repositório adequado:

```java
// Em ContaRepository.java
@Query("""
    SELECT c.categoria.descricao AS categoria,
           c.tipo AS tipo,
           SUM(c.valorOriginal) AS total,
           COUNT(c) AS quantidade
    FROM Conta c
    WHERE c.usuario.id = :uid
      AND c.dataVencimento BETWEEN :inicio AND :fim
      AND c.status IN :statuses
    GROUP BY c.categoria.descricao, c.tipo
    ORDER BY SUM(c.valorOriginal) DESC
    """)
List<RelatorioProjecao> relatorioAgrupado(
    @Param("uid") Long uid,
    @Param("inicio") LocalDate inicio,
    @Param("fim") LocalDate fim,
    @Param("statuses") Collection<StatusConta> statuses
);

// Projection interface
interface RelatorioProjecao {
    String getCategoria();
    String getTipo();
    BigDecimal getTotal();
    Long getQuantidade();
}
```

---

## 6. Padrão de Implementação Frontend

### 6.1 API Client (`src/lib/api.js`)

Adicionar namespace `relatorios` seguindo o padrão existente:

```javascript
// src/lib/api.js
export const relatorios = {
  // Relatório via chat (já existe)
  gerarViaChat: (mensagem) =>
    request('/api/chat', { method: 'POST', body: JSON.stringify({ mensagem }) }),

  // Endpoint direto (a implementar no backend)
  gerarFluxoCaixa: (inicio, fim) =>
    request(`/api/relatorios/fluxo-caixa?inicio=${inicio}&fim=${fim}`, {
      method: 'GET',
    }),

  gerarDRE: (inicio, fim) =>
    request(`/api/relatorios/dre?inicio=${inicio}&fim=${fim}`),

  gerarContasAbertas: () =>
    request('/api/relatorios/contas-abertas'),

  // Download direto (retorna blob)
  download: async (path) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error('Erro ao baixar relatório');
    return res.blob();
  },
};
```

### 6.2 Componente de Relatório (`Reports.jsx`)

Estrutura recomendada para cada relatório na tela:

```jsx
// src/views/Reports.jsx — Padrão para cartão de relatório
function ReportCard({ title, description, icon: Icon, onGenerate, loading }) {
  const [periodo, setPeriodo] = useState({
    inicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    fim: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  const handleDownload = async () => {
    try {
      const blob = await onGenerate(periodo.inicio, periodo.fim);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/ /g, '_')}_${periodo.inicio}_${periodo.fim}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      // exibir Toast de erro
    }
  };

  return (
    <div className="bg-surface-medium rounded-2xl p-6 border border-white/5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-white text-sm">{title}</h3>
          <p className="text-xs text-zinc-500">{description}</p>
        </div>
      </div>

      {/* Filtros de período */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">De</label>
          <input
            type="date"
            className="w-full bg-surface border border-white/5 rounded-xl px-3 py-2 text-white text-sm outline-none focus:ring-1 focus:ring-primary"
            value={periodo.inicio}
            onChange={e => setPeriodo(p => ({ ...p, inicio: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Até</label>
          <input
            type="date"
            className="w-full bg-surface border border-white/5 rounded-xl px-3 py-2 text-white text-sm outline-none focus:ring-1 focus:ring-primary"
            value={periodo.fim}
            onChange={e => setPeriodo(p => ({ ...p, fim: e.target.value }))}
          />
        </div>
      </div>

      <button
        onClick={handleDownload}
        disabled={loading}
        className="w-full bg-primary text-on-primary font-bold py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
      >
        <Download className="w-4 h-4" />
        {loading ? 'Gerando...' : 'Baixar Excel'}
      </button>
    </div>
  );
}
```

### 6.3 Design System (Tailwind Classes do Projeto)

Usar exclusivamente as classes e tokens definidos em `src/index.css`:

| Token | Valor | Uso |
|-------|-------|-----|
| `bg-surface` | `#131313` | Fundo da página |
| `bg-surface-low` | `#1C1B1B` | Cards principais |
| `bg-surface-medium` | `#2A2A2A` | Cards secundários |
| `bg-surface-highest` | `#353534` | Elementos destacados |
| `text-primary` / `bg-primary` | `#6EFFC0` | Ação principal |
| `text-on-primary` | `#003824` | Texto sobre fundo primary |
| `text-secondary` | `#ACC7FF` | Ação secundária |
| `text-error` | `#FFB4AB` | Erros e valores negativos |

---

## 7. Endpoint REST para Relatórios Diretos (A Implementar)

### 7.1 Controller Sugerido

```java
// core4erp/src/main/java/br/com/core4erp/relatorio/controller/RelatorioController.java
package br.com.core4erp.relatorio.controller;

import br.com.core4erp.chat.tools.relatorio.RelatorioExcelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@Tag(name = "Relatórios", description = "Geração de relatórios financeiros em Excel")
@RestController
@RequestMapping("/api/relatorios")
public class RelatorioController {

    private final RelatorioExcelService relatorioService;

    public RelatorioController(RelatorioExcelService relatorioService) {
        this.relatorioService = relatorioService;
    }

    @Operation(summary = "Gerar e baixar relatório de despesas/receitas")
    @GetMapping("/contas")
    public ResponseEntity<Resource> gerarRelatorioContas(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
            Authentication auth) {

        String fileName = relatorioService.gerarRelatorioDespesas(inicio, fim);
        Resource file = relatorioService.getRelatorio(auth.getName(), fileName);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"relatorio_contas_" + inicio + "_" + fim + ".xlsx\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(file);
    }
}
```

### 7.2 Adicionar ao `SecurityConfig.java`

O endpoint `/api/relatorios/**` já é coberto pela regra `.anyRequest().authenticated()` — nenhuma alteração necessária na segurança.

---

## 8. Prompt do C4 Assistant para Relatórios

### 8.1 Fluxo Conversacional Obrigatório

O assistente deve sempre seguir este fluxo ao solicitar relatórios:

```
1. IDENTIFICAR o tipo de relatório desejado
2. CONFIRMAR o período (pergunta clara: "Qual período? Ex: 01/01/2025 a 31/03/2025")
3. CONFIRMAR o formato desejado (Excel .xlsx ou visualização no chat)
4. CHAMAR a tool adequada com datas no formato ISO: YYYY-MM-DD
5. INFORMAR que o relatório está disponível e exibir o link de download
```

### 8.2 Exemplos de Frases do Usuário → Tool Correta

| Frase do usuário | Tool a chamar |
|-----------------|---------------|
| "gerar relatório de despesas do mês" | `gerarRelatorioExcel` (já existe) |
| "fluxo de caixa de janeiro" | `gerarRelatorioExcel` com tipo fluxo |
| "quais contas estão em atraso" | `consultarDashboard` → sinalizar para R02 |
| "extrato do cartão Nubank" | `consultarCartoes` + lançamentos por período |
| "quanto investi esse ano" | `consultarInvestimentos` + transações |
| "relatório DRE do trimestre" | `gerarRelatorioExcel` com período trimestral |

### 8.3 Regras do Sistema para o LLM

```
RELATÓRIOS — REGRAS INVIOLÁVEIS:
1. NUNCA gerar relatório sem confirmar o período com o usuário.
2. NUNCA inventar dados — sempre usar as tools para buscar informação real.
3. Sempre informar o formato de data esperado: DD/MM/YYYY (entrada do usuário).
4. Converter para ISO internamente antes de chamar a tool: YYYY-MM-DD.
5. Se o usuário pedir um tipo de relatório não implementado, informar claramente
   quais relatórios estão disponíveis e oferecer alternativas.
6. Ao exibir valores monetários nas respostas: usar formato BR — R$ 1.250,00.
7. O link de download deve ser informado ao usuário como: /api/chat/relatorios/{arquivo}.
8. Relatórios expiram em 60 minutos. Informar o usuário se necessário.
```

---

## 9. Checklist de Qualidade

Antes de submeter qualquer alteração no sistema de relatórios, verificar:

### Backend
- [ ] Query filtra por `usuario_id` (nunca expor dados de outros usuários)
- [ ] Arquivo gerado usa nome UUID — nunca nome previsível/manipulável
- [ ] Path traversal prevenido no método `getRelatorio()`
- [ ] `@Transactional(readOnly = true)` nas queries de leitura
- [ ] Workbook fechado com `try-with-resources`
- [ ] Colunas com `autoSizeColumn()` aplicado
- [ ] Cabeçalho com estilo bold
- [ ] Linhas numéricas usando `setCellValue(double)` (não String)
- [ ] Tool registrada em `ChatService` (parâmetro `.tools(...)`)
- [ ] Descrição da `@Tool` clara o suficiente para o LLM entender quando usá-la

### Frontend
- [ ] Componente usa `credentials: 'include'` nas requisições fetch
- [ ] Erros 401 redirecionam para `/login`
- [ ] Loading state durante geração
- [ ] Toast de sucesso/erro
- [ ] Download via `URL.createObjectURL` (não abre nova aba)
- [ ] Nome do arquivo no download é descritivo (inclui período)
- [ ] Classes Tailwind usam apenas tokens do design system do projeto
- [ ] Responsivo (funciona em mobile e desktop)

---

## 10. Estrutura de Arquivos — Onde Criar Cada Coisa

```
core4erp/src/main/java/br/com/core4erp/
│
├── chat/
│   └── tools/
│       └── relatorio/
│           ├── RelatorioExcelService.java   ← Métodos de geração de Excel
│           └── RelatorioTools.java          ← @Tool annotations para o LLM
│
└── relatorio/                               ← [NOVO] Para endpoints REST diretos
    ├── controller/
    │   └── RelatorioController.java
    ├── dto/
    │   ├── RelatorioFiltroDto.java          ← Parâmetros de filtro
    │   └── RelatorioLinhaDto.java           ← Linha de dados do relatório
    └── service/
        └── RelatorioService.java            ← Lógica de negócio

front-end/src/
│
├── views/
│   └── Reports.jsx                          ← Tela de relatórios (refatorar)
│
├── components/
│   └── reports/                             ← [NOVO] Componentes de relatório
│       ├── ReportCard.jsx                   ← Card reutilizável
│       ├── PeriodoFilter.jsx                ← Filtro de data início/fim
│       └── DownloadButton.jsx               ← Botão de download com loading
│
└── lib/
    └── api.js                               ← Adicionar namespace `relatorios`
```

---

## 11. Exemplos de Saída Esperada

### 11.1 Excel — Aba "Contas a Pagar/Receber"

| Nº Doc | Descrição | Categoria | Parceiro | Vencimento | Dias Atraso | Valor (R$) | Status |
|--------|-----------|-----------|---------|------------|-------------|-----------|--------|
| NF-001 | Aluguel Março | Imóveis | Imob. Silva | 05/03/2025 | 18 | 2.500,00 | ATRASADO |
| NF-002 | Energia Elétrica | Utilities | CEMIG | 20/03/2025 | 3 | 450,00 | ATRASADO |

### 11.2 Chat — Resposta após gerar relatório

```
Relatório de Contas Abertas gerado com sucesso!

Período: 01/01/2025 a 31/03/2025
Total de registros: 24

Resumo:
- Pendente: R$ 12.450,00 (18 contas)
- Atrasado: R$ 3.200,00 (6 contas)

O arquivo está disponível para download:
/api/chat/relatorios/[uuid].xlsx

O link expira em 60 minutos.
```

---

## 12. Roadmap de Evolução

### Fase 1 (Imediato)
- [ ] Implementar `RelatorioController` com endpoint GET direto
- [ ] Conectar `Reports.jsx` à API real (substituir dados mockados)
- [ ] Adicionar filtros por categoria e parceiro no relatório existente

### Fase 2 (Próximos sprints)
- [ ] Relatório R01: Fluxo de Caixa Realizado
- [ ] Relatório R02: Contas em Aberto com Aging
- [ ] Relatório R04: DRE Simplificado por Categoria

### Fase 3 (Futuro)
- [ ] Suporte a PDF além de Excel (usar biblioteca iText ou similar)
- [ ] Relatórios agendados (cron job + envio por email)
- [ ] Dashboard de relatórios com visualizações inline (Recharts já disponível)
- [ ] Exportação para Google Sheets via API

---

*Documento gerado para uso interno do projeto Core 4 ERP. Manter atualizado a cada nova implementação de relatório.*
