# Correções do TCC — Inclusão da Informação de Testes Unitários

> Documento de apoio para revisão do `TTC-2-CORE4-ERP-final.pdf`.
> Contém **somente os parágrafos/células que sofreram alteração**, com a indicação de
> **página**, **parágrafo** e **linha aproximada** (a numeração de linha é contada dentro da
> própria página, pois o texto é justificado e não possui numeração de linha impressa).
>
> **Motivo da correção:** o documento afirmava, em vários pontos, que o projeto possuía apenas
> um teste de contexto (cobertura ~0% da lógica de negócio). Após a implementação da classe
> `ParcelamentoHelperTest` (8 testes unitários, JUnit 5, executados com sucesso), essas passagens
> foram atualizadas.

---

## Onde inserir a informação de teste (capítulo/seção)

| Local no TCC | Página | O que fazer |
|---|---|---|
| **4.3 Validação e Testes** | 32 | Ajustar 2 parágrafos (Edições 1 e 2) |
| **4.3.3 Métricas de Engenharia de Software — Tabela 4** | 44 | Atualizar 2 linhas da tabela (Edição 3) |
| **4.3.3 — parágrafo introdutório da Tabela 10** | 48 | Reescrever o parágrafo (Edição 4) |
| **4.3.3 — Tabela 10 (Situação atual dos testes)** | 48 e 49 | Atualizar 5 células (Edições 5 e 6) |
| **4.3.3 — parágrafo de fechamento da Tabela 10** | 49 | Ajuste leve (Edição 7) |
| **7. Considerações Finais — limitações** | 67 | Ajuste leve (Edição 8) |

> A informação principal de teste é descrita nas **Edições 1, 2 e 4**. As demais apenas
> sincronizam números e ressalvas com a nova realidade.

---

## EDIÇÃO 1

- **Página:** 32
- **Seção:** 4.3 Validação e Testes
- **Parágrafo:** 2º parágrafo da seção 4.3 (o que começa com "O projeto possui estrutura de testes…")
- **Linhas aprox.:** 8 a 15 da página

**ANTES:**
> O projeto possui estrutura de testes automatizados no backend, porém a cobertura atual ainda se
> limita ao teste básico de carregamento do contexto da aplicação. Por esse motivo, a validação
> descrita neste trabalho concentrou-se principalmente em testes funcionais manuais e
> exploratórios, execução dos principais fluxos de negócio, conferência das rotas REST e análise da
> coerência entre interface, services, repositories, entidades e banco de dados. Essa escolha é
> apresentada como limitação metodológica e também como direcionamento para evolução futura da
> qualidade do sistema.

**DEPOIS:**
> O projeto possui estrutura de testes automatizados no backend, contemplando tanto um teste de
> carregamento do contexto da aplicação quanto testes unitários voltados à lógica de negócio. Ainda
> assim, a cobertura permanece parcial, concentrada na lógica de parcelamento de lançamentos. Por
> esse motivo, a validação descrita neste trabalho combinou esses testes automatizados com testes
> funcionais manuais e exploratórios, execução dos principais fluxos de negócio, conferência das
> rotas REST e análise da coerência entre interface, services, repositories, entidades e banco de
> dados. Essa escolha é apresentada como limitação metodológica e também como direcionamento para
> evolução futura da qualidade do sistema.

---

## EDIÇÃO 2

- **Página:** 32
- **Seção:** 4.3 Validação e Testes
- **Parágrafo:** 4º parágrafo da seção 4.3 (o que começa com "Embora não tenham sido implementados testes unitários…")
- **Linhas aprox.:** 25 a 34 da página

**ANTES:**
> Embora não tenham sido implementados testes unitários específicos para todas as regras
> financeiras, eles seriam recomendados para serviços como baixa, estorno, transferência,
> fechamento de fatura, conciliação bancária, geração de notificações e recorrência de assinaturas.
> No backend Java, esses testes poderiam ser estruturados com JUnit 5, framework voltado à escrita
> e execução de testes automatizados em aplicações Java (JUNIT, 2026). Já os testes de integração
> poderiam validar a comunicação entre controllers, services, repositories, banco de dados e
> segurança, utilizando os recursos de teste disponibilizados pelo Spring Boot para carregamento do
> contexto, simulação de requisições HTTP e verificação de integrações com a camada de persistência
> (SPRING BOOT, 2026).

**DEPOIS:**
> Foram implementados testes unitários para a lógica de parcelamento de lançamentos, escritos com
> JUnit 5, embora ainda não existam testes específicos para todas as regras financeiras. Para
> serviços como baixa, estorno, transferência, fechamento de fatura, conciliação bancária, geração
> de notificações e recorrência de assinaturas, esses testes seriam igualmente recomendados e podem
> ser estruturados com o mesmo framework JUnit 5, voltado à escrita e execução de testes
> automatizados em aplicações Java (JUNIT, 2026). Já os testes de integração poderiam validar a
> comunicação entre controllers, services, repositories, banco de dados e segurança, utilizando os
> recursos de teste disponibilizados pelo Spring Boot para carregamento do contexto, simulação de
> requisições HTTP e verificação de integrações com a camada de persistência (SPRING BOOT, 2026).

---

## EDIÇÃO 3

- **Página:** 44
- **Elemento:** Tabela 4 — Resumo executivo das métricas de engenharia de software
- **Linhas aprox.:** 2 últimas linhas da tabela (penúltima e última)

**ANTES (2 células):**
> | Classes de teste automatizado | 1 |
> | Cobertura de testes (lógica de negócio) | ~0% |

**DEPOIS (2 células):**
> | Classes de teste automatizado | 2 |
> | Cobertura de testes (lógica de negócio) | Parcial (lógica de parcelamento coberta) |

---

## EDIÇÃO 4

- **Página:** 48
- **Seção:** 4.3.3 Métricas de Engenharia de Software
- **Parágrafo:** parágrafo imediatamente anterior à Tabela 10 (o que começa com "No que se refere à cobertura de testes automatizados…")
- **Linhas aprox.:** 21 a 27 da página

**ANTES:**
> No que se refere à cobertura de testes automatizados, a Tabela 10 sintetiza a situação atual do
> projeto. O único teste existente verifica exclusivamente se o contexto da aplicação Spring
> inicializa sem erros, sem exercitar regras de negócio, endpoints ou repositórios. Essa limitação é
> reconhecida como oportunidade de melhoria e está registrada nos trabalhos futuros do projeto.

**DEPOIS:**
> No que se refere à cobertura de testes automatizados, a Tabela 10 sintetiza a situação atual do
> projeto. Além do teste que verifica se o contexto da aplicação Spring inicializa sem erros, foi
> implementada uma classe de testes unitários que exercita a lógica de parcelamento de lançamentos,
> com oito casos de teste executados com sucesso. A cobertura, contudo, permanece parcial —
> restrita à lógica de parcelamento e sem alcançar a totalidade das regras de negócio, endpoints e
> repositórios —, o que é reconhecido como oportunidade de melhoria e está registrado nos trabalhos
> futuros do projeto.

---

## EDIÇÃO 5

- **Página:** 48
- **Elemento:** Tabela 10 — Situação atual dos testes automatizados (primeira linha, no fim da página 48)
- **Linha aprox.:** última linha da página (1ª linha de dados da tabela)

**ANTES (1 célula):**
> | Classes de teste | 1 (Core4erpApplicationTests) |

**DEPOIS (1 célula):**
> | Classes de teste | 2 (Core4erpApplicationTests e ParcelamentoHelperTest) |

---

## EDIÇÃO 6

- **Página:** 49
- **Elemento:** Tabela 10 — Situação atual dos testes automatizados (continuação, topo da página 49)
- **Linhas aprox.:** linhas 1 a 5 da página (células da tabela)

**ANTES (4 células):**
> | Métodos de teste | 1 (contextLoads) |
> | Tipo de teste existente | Smoke test de carregamento do contexto Spring |
> | Cobertura de lógica de negócio | ~0% |
> | Relação teste : produção (classes) | 1 : 154 (~0,65%) |

**DEPOIS (4 células):**
> | Métodos de teste | 9 (contextLoads e 8 testes unitários de parcelamento) |
> | Tipo de teste existente | Smoke test de contexto Spring e testes unitários de lógica de negócio (parcelamento) |
> | Cobertura de lógica de negócio | Parcial (lógica de parcelamento) |
> | Relação teste : produção (classes) | 2 : 154 (~1,3%) |

> Observação: a linha "Ferramenta de cobertura (JaCoCo) | Não configurada" **permanece inalterada**,
> pois a ferramenta de medição de cobertura segue não configurada.

---

## EDIÇÃO 7

- **Página:** 49
- **Seção:** 4.3.3 Métricas de Engenharia de Software
- **Parágrafo:** parágrafo logo após a Tabela 10 (o que começa com "Apesar da cobertura de testes reduzida…")
- **Linha aprox.:** linha 7 da página (apenas o início do parágrafo muda)

**ANTES (início do parágrafo):**
> Apesar da cobertura de testes reduzida, o build.gradle já declara as dependências necessárias para
> evolução da suíte, incluindo spring-boot-starter-test, que fornece JUnit 5, Mockito, AssertJ,
> MockMvc e JSONPath, além de spring-security-test […]

**DEPOIS (início do parágrafo):**
> Apesar de a cobertura de testes ainda ser parcial, o build.gradle já declara as dependências
> necessárias para a evolução da suíte, incluindo spring-boot-starter-test, que fornece JUnit 5,
> Mockito, AssertJ, MockMvc e JSONPath, além de spring-security-test […]

> O restante do parágrafo permanece igual.

---

## EDIÇÃO 8

- **Página:** 67
- **Seção:** 7. Considerações Finais
- **Parágrafo:** parágrafo de limitações (o que começa com "Apesar dos resultados obtidos, o trabalho apresenta limitações…")
- **Linha aprox.:** frase nas linhas 4 a 6 da página (apenas a frase sobre cobertura de testes muda)

**ANTES (frase dentro do parágrafo):**
> A cobertura de testes automatizados ainda é limitada, especialmente para regras financeiras
> críticas e fluxos transacionais.

**DEPOIS (frase dentro do parágrafo):**
> A cobertura de testes automatizados, embora já contemple testes unitários da lógica de
> parcelamento, ainda é parcial, especialmente para as demais regras financeiras críticas e fluxos
> transacionais.

> O restante do parágrafo permanece igual.

---

## Itens que NÃO precisam de alteração

- **7.1 Trabalhos Futuros (p. 67), bullet "Ampliar a cobertura de testes unitários e de integração
  para regras financeiras críticas."** — já usa o verbo "ampliar", coerente com a existência de
  testes unitários iniciais. Pode permanecer como está.
- **Tabela 10, linha "Ferramenta de cobertura (JaCoCo) | Não configurada"** — permanece.

---

## Resumo da nova realidade de testes (base das correções)

- **Classe criada:** `ParcelamentoHelperTest`
  (`core4erp/src/test/java/br/com/core4erp/utils/ParcelamentoHelperTest.java`).
- **8 testes unitários** com JUnit 5, sem Spring e sem banco, cobrindo a lógica de parcelamento:
  normalização de parcelas/intervalo, cálculo do valor por parcela (arredondamento HALF_UP) e
  geração do grupo de parcelamento.
- **Resultado:** `BUILD SUCCESSFUL` — os 8 testes passam.
- **Total de classes de teste no projeto:** 2 (`Core4erpApplicationTests` + `ParcelamentoHelperTest`).
- Detalhamento completo no arquivo `teste.md`.
