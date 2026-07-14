# Relatório QA — Diagnóstico e Implementação Full-Stack

---

## 📋 Sumário Executivo

Este plano cobre dois eixos: **correções de back-end** (4 erros de API) e **novas funcionalidades de front-end** (filtros, modais, validações). O trabalho está organizado em dois agentes conforme solicitado.

---

# 🔧 AGENTE 1 — Engenheiro Back-end e Especialista em Diagnóstico

## Diagnóstico Técnico — Cruzamento de Logs

### Erro 1: `/api/auditoria?page=0&size=50` → Status 500 (Internal Server Error)

**Evidência no log:**
```
[2026-06-03T13:05:59Z] ERROR — PSQLException: could not determine data type of parameter $10
SQL: select ... from tb_auditoria a1_0 where a1_0.empresa_id=?
  and (? is null or a1_0.entidade=?)
  and (? is null or a1_0.entidade_id=?)
  and (? is null or a1_0.acao=?)
  and (? is null or a1_0.usuario_id=?)
  and (? is null or a1_0.timestamp>=?)  ← $10 é o parâmetro nullable aqui
  and (? is null or a1_0.timestamp<=?)
```

**Causa raiz identificada:** Duplo problema no [AuditoriaRepository.java](file:///home/eduardoa/Documentos/Projetos/TCC/Core4erp_Producao/Core-4-ERP/core4erp/src/main/java/br/com/core4erp/empresa/repository/AuditoriaRepository.java):

1. **Parâmetros nullable com `IS NULL` em JPQL:** O PostgreSQL não consegue inferir o tipo do parâmetro `$10` quando `:dataInicio` é `null` na expressão `(:dataInicio IS NULL OR a.dataHora >= :dataInicio)`. Hibernate 6 gera `(? is null or a1_0.timestamp >= ?)` com dois binds do mesmo parâmetro, mas o PostgreSQL não consegue resolver o tipo do primeiro `?` sem contexto.

2. **Coluna `timestamp` como palavra reservada HQL:** A entidade [Auditoria.java](file:///home/eduardoa/Documentos/Projetos/TCC/Core4erp_Producao/Core-4-ERP/core4erp/src/main/java/br/com/core4erp/empresa/entity/Auditoria.java#L51-L52) mapeia `@Column(name = "timestamp")` ao campo `dataHora`, mas o SQL gerado referencia `a1_0.timestamp` diretamente — isso é consistente com o CLAUDE.md que documenta esta armadilha exata.

**Solução:** Reescrever a query do repositório usando **Criteria API dinâmica** (ou query nativa com cast) para evitar o problema de parâmetros nullable. A abordagem mais limpa é mover para `JpaSpecificationExecutor` ou usar construção dinâmica no service.

> [!IMPORTANT]
> Esta é a correção mais crítica — o endpoint de auditoria está 100% quebrado em produção.

---

### Erro 2: `/api/cartoes/dashboard/bi` → Status 400 (Bad Request)

**Evidência no log:** Não há stack trace específico nos logs para este endpoint (o erro 400 é tratado pelo `GlobalExceptionHandler` sem gerar stack trace de ERROR). O erro é lançado como `IllegalArgumentException` pelo service.

**Causa raiz identificada:** Analisando [CartaoCreditoService.dashboardBI()](file:///home/eduardoa/Documentos/Projetos/TCC/Core4erp_Producao/Core-4-ERP/core4erp/src/main/java/br/com/core4erp/cartaoCredito/service/CartaoCreditoService.java#L404-L512), quando os parâmetros `mesInicio/anoInicio/mesFim/anoFim` são todos `null`, o service calcula defaults (`fim = now`, `inicio = fim - 11 meses`). **Não há bug no backend em si** — o problema é no **front-end**: o `CartaoDashboard.jsx` chama `carregarBi(emptyVal)` com todos os valores `null`, o que funciona. 

**Porém**, a condição de 400 pode ocorrer quando o front-end envia parâmetros parciais (ex: apenas `mesInicio` sem `anoInicio`), causando `YearMonth.of(null, mesInicio)` → `NullPointerException` → 500 (não 400). Revisando mais cuidadosamente, o endpoint **deveria** lançar 400 se recebermos combinação inválida como `mesInicio=1` sem `anoInicio`.

**Solução:** Adicionar validação defensiva no controller/service para tratar parâmetros parciais de forma graciosa, e no front-end, garantir que o estado inicial carregue com datas padrão (últimos 30 dias).

---

### Erro 3: `/api/cartoes/conciliacao/upload` → Status 400 (Bad Request)

**Evidência no log:** Sem stack trace ERROR para este endpoint nos logs coletados. O 400 vem do `handleIllegalArgument` no [GlobalExceptionHandler](file:///home/eduardoa/Documentos/Projetos/TCC/Core4erp_Producao/Core-4-ERP/core4erp/src/main/java/br/com/core4erp/exception/GlobalExceptionHandler.java#L81-L86).

**Causa raiz identificada:** O [OfxCartaoParserService](file:///home/eduardoa/Documentos/Projetos/TCC/Core4erp_Producao/Core-4-ERP/core4erp/src/main/java/br/com/core4erp/conciliacaoCartao/service/OfxCartaoParserService.java#L25-L27) lança `IllegalArgumentException("Arquivo OFX não é de cartão de crédito...")` quando o arquivo não contém `<CREDITCARDMSGSRSV1>`. O [ConciliacaoCartaoService.processar()](file:///home/eduardoa/Documentos/Projetos/TCC/Core4erp_Producao/Core-4-ERP/core4erp/src/main/java/br/com/core4erp/conciliacaoCartao/service/ConciliacaoCartaoService.java#L106-L118) propaga como `IllegalArgumentException("Arquivo OFX inválido: ...")`.

**Cenários de 400:**
1. Upload de arquivo OFX bancário (não de cartão) na tela de conciliação de cartão
2. Arquivo corrompido/vazio/não-OFX
3. Arquivo maior que 5MB

**Solução:** O parser e as validações do backend estão corretos. A melhoria é no **front-end** — adicionar validação mais clara no `OfxCartaoUploadZone` e melhorar as mensagens de erro para o usuário.

---

### Erro 4: `/api/parceiros` → Status 422 (Unprocessable Entity)

**Evidência no log:** O 422 vem do handler `handleValidation` (MethodArgumentNotValidException) no [GlobalExceptionHandler](file:///home/eduardoa/Documentos/Projetos/TCC/Core4erp_Producao/Core-4-ERP/core4erp/src/main/java/br/com/core4erp/exception/GlobalExceptionHandler.java#L42-L50).

**Causa raiz identificada:** O [ParceiroRequestDto](file:///home/eduardoa/Documentos/Projetos/TCC/Core4erp_Producao/Core-4-ERP/core4erp/src/main/java/br/com/core4erp/parceiro/dto/ParceiroRequestDto.java) exige:
- `razaoSocial` → `@NotBlank` (obrigatório)
- `tipo` → `@NotNull` (obrigatório)

O campo `cpfCnpj` **não é obrigatório** no DTO atual (apenas `@Size(max=20)`). O QA reporta que `cpfCnpj` deveria ser obrigatório.

**Solução:** Tornar `cpfCnpj` obrigatório no DTO com `@NotBlank`, e atualizar a validação do front-end para refletir isso.

---

## Plano de Ação — Back-end

### [MODIFY] [AuditoriaRepository.java](file:///home/eduardoa/Documentos/Projetos/TCC/Core4erp_Producao/Core-4-ERP/core4erp/src/main/java/br/com/core4erp/empresa/repository/AuditoriaRepository.java)

Substituir a `@Query` JPQL com nullable params por uma **query nativa** com `CAST` explícito, ou migrar para query construída dinamicamente no service via `CriteriaBuilder`.

Abordagem escolhida: **Query nativa com cast** — é a correção mais cirúrgica para o problema de `could not determine data type of parameter $10`.

```java
@Query(value = """
    SELECT * FROM tb_auditoria a
    WHERE a.empresa_id = :empresaId
      AND (:entidade IS NULL OR a.entidade = :entidade)
      AND (CAST(:entidadeId AS BIGINT) IS NULL OR a.entidade_id = :entidadeId)
      AND (CAST(:acao AS VARCHAR) IS NULL OR a.acao = :acao)
      AND (CAST(:usuarioId AS BIGINT) IS NULL OR a.usuario_id = :usuarioId)
      AND (CAST(:dataInicio AS TIMESTAMP) IS NULL OR a.timestamp >= :dataInicio)
      AND (CAST(:dataFim AS TIMESTAMP) IS NULL OR a.timestamp <= :dataFim)
    ORDER BY a.timestamp DESC
    """, nativeQuery = true)
```

> [!NOTE]
> Como é native query, o `ORDER BY` no SQL é válido (a restrição do Hibernate 6 sobre ORDER BY + Pageable só se aplica a JPQL).

---

### [MODIFY] [ParceiroRequestDto.java](file:///home/eduardoa/Documentos/Projetos/TCC/Core4erp_Producao/Core-4-ERP/core4erp/src/main/java/br/com/core4erp/parceiro/dto/ParceiroRequestDto.java)

Tornar `cpfCnpj` obrigatório:
```java
@NotBlank(message = "CPF/CNPJ é obrigatório")
@Size(max = 20) String cpfCnpj,
```

---

### [MODIFY] [CartaoCreditoService.java](file:///home/eduardoa/Documentos/Projetos/TCC/Core4erp_Producao/Core-4-ERP/core4erp/src/main/java/br/com/core4erp/cartaoCredito/service/CartaoCreditoService.java)

Adicionar validação defensiva no `dashboardBI()` para tratar parâmetros parciais:
```java
// Validar que mesInicio/anoInicio venham juntos
if ((mesInicio != null) != (anoInicio != null))
    throw new IllegalArgumentException("Informe mês e ano de início juntos");
if ((mesFim != null) != (anoFim != null))
    throw new IllegalArgumentException("Informe mês e ano de fim juntos");
```

Mesma validação para `dashboardResumo()`.

---

### [MODIFY] [AuditoriaController.java](file:///home/eduardoa/Documentos/Projetos/TCC/Core4erp_Producao/Core-4-ERP/core4erp/src/main/java/br/com/core4erp/empresa/controller/AuditoriaController.java)

Remover a construção manual de `PageRequest` e usar `@PageableDefault` conforme padrão do projeto:
```java
@PageableDefault(size = 50, sort = "timestamp", direction = Sort.Direction.DESC)
Pageable pageable
```

> [!NOTE]
> Com native query, o sort field é o nome da coluna real (`timestamp`), não o campo Java.

---

# 🎨 AGENTE 2 — Engenheiro Front-end e Especialista em UI/UX

## Tarefas de Implementação

### 1. Dashboard de Cartões — Filtros Ágeis e DatePicker

#### [MODIFY] [CartaoDashboard.jsx](file:///home/eduardoa/Documentos/Projetos/TCC/Core4erp_Producao/Core-4-ERP/front-end/src/views/CartaoDashboard.jsx)

**Mudanças:**

1. **Estado inicial com últimos 30 dias:** Alterar `emptyVal` para calcular `dataInicio` e `dataFim` baseado em 30 dias atrás. Converter para mes/ano para o PeriodoSelector.

2. **Grupo de botões rápidos:** Adicionar botões "Últimos 30 dias" (default), "Hoje", "Últimos 15 dias" abaixo do cabeçalho do painel BI. Cada botão seta o período e recarrega o BI.

3. **Botão "Busca Personalizada":** Abre um modal com DatePicker de intervalo customizado. O usuário pode digitar datas (`dd/mm/yyyy`) ou selecionar no calendário.

#### [NEW] `front-end/src/components/ui/DateRangeModal.jsx`

Componente modal com:
- Dois campos de data (início/fim) com máscara `dd/mm/yyyy`
- Calendário visual navegável (mês a mês) usando lógica nativa (sem dependência extra — `date-fns` já está no projeto)
- Botões "Aplicar" e "Cancelar"
- Validação: data início ≤ data fim
- Design glassmorphism seguindo os padrões visuais do projeto

---

### 2. Subcadastros em Conciliação

#### [NEW] `front-end/src/components/ui/ModalCriacaoRapida.jsx`

Componente genérico que renderiza um modal de criação rápida. Já existe no padrão do projeto (mencionado no CLAUDE.md como implementado em `Melhorias_Cartao.md §4`).

**Verificação:** Preciso confirmar se o `ModalCriacaoRapida` já existe. Pela estrutura dos componentes de conciliação (`FormularioNovoLancamentoInline`, `VincularLancamentoModal`), os modais já existem inline.

**Ação:** Garantir que os atalhos de criação rápida (Parceiro + Categoria) estejam acessíveis em **ambas** as telas:
- `/cartoes/conciliacao/` → [ConciliacaoCartao.jsx](file:///home/eduardoa/Documentos/Projetos/TCC/Core4erp_Producao/Core-4-ERP/front-end/src/views/ConciliacaoCartao.jsx) e [FormularioNovoLancamentoInline.jsx](file:///home/eduardoa/Documentos/Projetos/TCC/Core4erp_Producao/Core-4-ERP/front-end/src/components/conciliacaoCartao/FormularioNovoLancamentoInline.jsx)
- `/conciliacao/` → [Conciliacao.jsx](file:///home/eduardoa/Documentos/Projetos/TCC/Core4erp_Producao/Core-4-ERP/front-end/src/views/Conciliacao.jsx) e [FormularioNovaContaInline.jsx](file:///home/eduardoa/Documentos/Projetos/TCC/Core4erp_Producao/Core-4-ERP/front-end/src/components/conciliacao/FormularioNovaContaInline.jsx)

#### Cadastro de Categoria — Dropdown de ícones

#### [NEW] `front-end/src/components/ui/IconDropdown.jsx`

Componente visual de Dropdown/Select customizado para seleção de ícones:
- Trigger mostra o ícone selecionado + nome
- Dropdown abre com grid de ícones (similar ao grid existente em [Categorias.jsx](file:///home/eduardoa/Documentos/Projetos/TCC/Core4erp_Producao/Core-4-ERP/front-end/src/views/Categorias.jsx#L185-L203) mas em formato dropdown)
- Barra de busca no topo para filtrar ícones por nome
- Agrupamento por categoria (Compras, Habitação, Transporte, etc.)
- Animação de abertura/fechamento suave

Será usado nos modais de criação rápida de Categoria dentro das telas de conciliação.

---

### 3. Cadastro de Parceiro — Validação Rigorosa

#### [MODIFY] [Parceiros.jsx](file:///home/eduardoa/Documentos/Projetos/TCC/Core4erp_Producao/Core-4-ERP/front-end/src/views/Parceiros.jsx)

**Mudanças:**

1. **CPF/CNPJ obrigatório:** Atualizar `validateForm()` para exigir `cpfCnpj` (alinhando com o back-end).

2. **Tipo como Dropdown com opções formatadas:** O select já existe com opções `CLIENTE`, `FORNECEDOR`, `AMBOS`. Manter mas melhorar visualmente com ícones.

3. **Auto-preenchimento CNPJ:** O `handleCpfCnpjChange` já implementa a chamada à BrasilAPI via `api.buscarCnpj()`. Manter e melhorar o UX:
   - Adicionar feedback visual mais proeminente durante a busca
   - Mostrar badge de "Dados carregados da Receita Federal" após preenchimento
   - Destacar campos que foram autopreenchidos

4. **Razão Social obrigatória:** Já implementado com `@NotBlank` no back e `required` no front.

---

## Verificação

### Automated Tests
```bash
cd core4erp && ./gradlew build  # Verifica compilação back-end
cd front-end && npm run build   # Verifica build front-end
```

### Manual Verification
- Testar endpoint `/api/auditoria?page=0&size=50` com todos os filtros null → deve retornar 200
- Testar `/api/cartoes/dashboard/bi` sem parâmetros → deve retornar 200 com dados dos últimos 12 meses
- Testar criação de parceiro sem CPF/CNPJ → deve retornar 422
- Testar upload de arquivo .ofx bancário na conciliação de cartão → deve retornar 400 com mensagem clara
- Verificar filtros ágeis no Dashboard de Cartões
- Verificar modal de DatePicker customizado
- Verificar modais de criação rápida nas telas de conciliação
