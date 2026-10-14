# Documentação de Testes — Core 4 ERP

Este documento descreve os testes automatizados existentes no projeto, **o que** cada um
verifica, **como** foram implementados e **como executá-los**.

---

## 1. Visão Geral

O projeto possui dois conjuntos de testes no backend (`core4erp`):

| Arquivo | Tipo | Precisa de banco/infra? | Status |
|---|---|---|---|
| `Core4erpApplicationTests.java` | Teste de contexto (integração) | **Sim** (PostgreSQL + `.env`) | Pré-existente |
| `ParcelamentoHelperTest.java` | Teste unitário puro | **Não** | Criado neste trabalho |

A estratégia adotada foi escrever **testes unitários puros** — ou seja, sem subir o contexto
do Spring, sem conexão com banco de dados e sem mocks. São os testes mais simples possíveis:
exercitam apenas lógica determinística de uma classe utilitária, rodam em milissegundos e
sempre produzem o mesmo resultado.

---

## 2. Ferramentas Utilizadas

Nenhuma dependência nova precisou ser adicionada — tudo já estava configurado no `build.gradle`:

- **JUnit 5 (Jupiter)** — framework de testes, vem incluído em `spring-boot-starter-test`.
- **Gradle** — executor dos testes, já com `useJUnitPlatform()` configurado.

Trecho relevante do `build.gradle`:

```gradle
dependencies {
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
    testImplementation 'org.springframework.security:spring-security-test'
}

tasks.named('test') {
    useJUnitPlatform()
}
```

---

## 3. Testes Implementados

### 3.1 `ParcelamentoHelperTest`

**Local:** `core4erp/src/test/java/br/com/core4erp/utils/ParcelamentoHelperTest.java`

**Classe testada:** `br.com.core4erp.utils.ParcelamentoHelper` — classe utilitária com métodos
`static` que tratam a lógica de parcelamento de lançamentos (normalização de quantidade de
parcelas, cálculo do valor por parcela e geração do identificador de grupo de parcelamento).

Essa classe foi escolhida por ser **lógica pura**: não acessa banco, não depende do Spring e é
totalmente determinística — o cenário ideal para o teste mais simples possível.

#### Casos de teste (8 no total)

| # | Método de teste | O que verifica |
|---|---|---|
| 1 | `normalizarParcelas_quandoNuloOuInvalido_retornaUm` | Entrada `null`, `0` ou negativa → resultado `1` |
| 2 | `normalizarParcelas_quandoValido_mantemValor` | Entrada `3` → resultado `3` |
| 3 | `normalizarIntervalo_quandoNuloOuInvalido_retornaUm` | Entrada `null` ou `0` → resultado `1` |
| 4 | `normalizarIntervalo_quandoValido_mantemValor` | Entrada `2` → resultado `2` |
| 5 | `calcularValorPorParcela_quandoDivide_arredondaEmDuasCasas` | `100,00` em 3 parcelas → `33,33` (arredondamento `HALF_UP`, 2 casas) |
| 6 | `calcularValorPorParcela_quandoNaoDivide_retornaValorTotal` | Com 1 parcela ou `dividir=false` → retorna o valor total inalterado |
| 7 | `gerarGrupoParcelamento_quandoParcelaUnica_retornaNulo` | 1 parcela → `null` (não há grupo) |
| 8 | `gerarGrupoParcelamento_quandoMultiplasParcelas_retornaIdentificador` | 3 parcelas → identificador não nulo |

#### Como foi feito

1. **Sem anotações de Spring** — a classe de teste não usa `@SpringBootTest`. É uma classe Java
   comum, anotada apenas com `@Test` do JUnit em cada método. Isso elimina a necessidade de
   banco de dados e variáveis de ambiente.

2. **Chamadas estáticas diretas** — como os métodos de `ParcelamentoHelper` são `static`, os
   testes os invocam diretamente (`ParcelamentoHelper.normalizarParcelas(...)`), sem precisar
   instanciar a classe nem criar mocks.

3. **Comparação correta de `BigDecimal`** — para valores monetários, a verificação usa
   `compareTo(...) == 0` em vez de `equals(...)`. Isso segue a regra do projeto: `BigDecimal`
   com escalas diferentes (ex.: `33.33` vs `33.330`) não são iguais por `equals`, mas são iguais
   por `compareTo`.

Exemplo de um dos testes:

```java
@Test
void calcularValorPorParcela_quandoDivide_arredondaEmDuasCasas() {
    BigDecimal resultado = ParcelamentoHelper.calcularValorPorParcela(new BigDecimal("100.00"), 3, true);
    assertEquals(0, new BigDecimal("33.33").compareTo(resultado));
}
```

---

### 3.2 `Core4erpApplicationTests` (pré-existente)

**Local:** `core4erp/src/test/java/br/com/core4erp/Core4erpApplicationTests.java`

É um teste de **carga de contexto** gerado pelo Spring Boot. O método `contextLoads()` apenas
verifica se a aplicação inteira sobe sem erros de configuração.

```java
@SpringBootTest
class Core4erpApplicationTests {
    @Test
    void contextLoads() {
    }
}
```

> ⚠️ **Atenção:** por usar `@SpringBootTest`, esse teste **sobe o contexto completo do Spring** e,
> portanto, exige um PostgreSQL acessível e as variáveis de ambiente do `.env` (como `SECRET_KEY`).
> Sem essa infraestrutura, ele falha. Por isso, para uma execução simples e independente de
> infraestrutura, recomenda-se rodar apenas o teste unitário (ver seção 4).

---

## 4. Como Executar os Testes

Todos os comandos são executados a partir da pasta `core4erp`.

### Executar apenas o teste unitário (recomendado — não precisa de banco)

```bash
cd core4erp
./gradlew test --tests "br.com.core4erp.utils.ParcelamentoHelperTest"
```

Saída esperada:

```
BUILD SUCCESSFUL
```

### Executar todos os testes

```bash
cd core4erp
./gradlew test
```

> Isso também executa `Core4erpApplicationTests.contextLoads()`, que **requer banco e variáveis
> de ambiente configurados**. Se a infraestrutura não estiver disponível, esse teste de contexto
> falhará — o teste unitário, porém, continua passando normalmente.

### Ver o relatório detalhado

Após rodar, o Gradle gera um relatório HTML em:

```
core4erp/build/reports/tests/test/index.html
```

---

## 5. Resultado da Última Execução

O teste `ParcelamentoHelperTest` foi executado com sucesso:

```
> Task :compileTestJava
> Task :test

BUILD SUCCESSFUL
```

Os **8 casos de teste passaram**, confirmando que a lógica de parcelamento funciona conforme
esperado e que o projeto possui testes automatizados em funcionamento.

---

## 6. Resumo

- O projeto conta com **testes unitários puros** sobre a classe `ParcelamentoHelper`, cobrindo
  normalização de parcelas/intervalo, cálculo de valor por parcela e geração de grupo de
  parcelamento.
- Esses testes são **simples, rápidos e independentes de infraestrutura** (não precisam de banco
  nem do Spring).
- Nenhuma dependência nova foi necessária — JUnit 5 já fazia parte do projeto.
- Comando para validar: `./gradlew test --tests "br.com.core4erp.utils.ParcelamentoHelperTest"`.
