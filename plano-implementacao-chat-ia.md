# Plano de Implementação: Chat Interativo com IA — Core 4 ERP

## Spring AI + assistant-ui | Arquitetura Limpa & Boas Práticas

---

## Sumário

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Princípios e Padrões Adotados](#2-princípios-e-padrões-adotados)
3. [Fase 1 — Preparação do Ambiente](#3-fase-1--preparação-do-ambiente)
4. [Fase 2 — Camada de Domínio do Chat (Backend)](#4-fase-2--camada-de-domínio-do-chat-backend)
5. [Fase 3 — Tools de Consulta (Leitura)](#5-fase-3--tools-de-consulta-leitura)
6. [Fase 4 — Tools de Lançamento (Escrita + Confirmação)](#6-fase-4--tools-de-lançamento-escrita--confirmação)
7. [Fase 5 — Tool de Relatório (Geração de Excel)](#7-fase-5--tool-de-relatório-geração-de-excel)
8. [Fase 6 — Frontend com assistant-ui](#8-fase-6--frontend-com-assistant-ui)
9. [Fase 7 — Streaming (SSE)](#9-fase-7--streaming-sse)
10. [Fase 8 — Segurança, Observabilidade e Hardening](#10-fase-8--segurança-observabilidade-e-hardening)
11. [Fase 9 — Testes](#11-fase-9--testes)
12. [Apêndice A — Catálogo Completo de Tools](#apêndice-a--catálogo-completo-de-tools)
13. [Apêndice B — Checklist de Entrega por Fase](#apêndice-b--checklist-de-entrega-por-fase)

---

## 1. Visão Geral da Arquitetura

### 1.1 Decisões Arquiteturais

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Framework de IA (Backend) | Spring AI 1.0+ | Nativo ao ecossistema Spring Boot 3.3 já em uso; Function Calling de primeira classe; troca de provider por configuração |
| Biblioteca de Chat (Frontend) | assistant-ui (LocalRuntime) | Elimina semanas de construção de UI de chat; primitivos composáveis compatíveis com Tailwind; suporte nativo a Tool UI e streaming |
| Protocolo de comunicação | REST (fase inicial) → SSE (fase streaming) | REST é simples para MVP; SSE via `SseEmitter` do Spring para streaming real sem WebSocket |
| Gerenciamento de estado (chat) | assistant-ui `LocalRuntime` | O runtime gerencia mensagens, branching e retry internamente; o backend é stateless |
| Memória de conversa | `MessageWindowChatMemory` (Spring AI) | Janela deslizante de N mensagens; evita estouro de contexto do LLM; sem persistência no MVP |
| Geração de relatórios | Apache POI 5.3 | Biblioteca Java padrão para XLSX; já compatível com o ecossistema |
| Provider LLM padrão | OpenAI (GPT-4o) | Melhor suporte a Function Calling; substituível por Anthropic/Google via `application.properties` |

### 1.2 Diagrama de Camadas

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 19 + Vite)                  │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  assistant-ui (LocalRuntime)                                 │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │   │
│  │  │   Thread     │  │   Composer    │  │  Tool UIs         │   │   │
│  │  │  (mensagens) │  │  (input)      │  │  (confirmação,    │   │   │
│  │  │              │  │               │  │   download, etc.) │   │   │
│  │  └─────────────┘  └──────────────┘  └───────────────────┘   │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │ POST /api/chat (JWT cookie)          │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────────┐
│                    BACKEND (Spring Boot 3.3)                        │
│                             │                                       │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │  Camada de Apresentação                                     │    │
│  │  ChatController → valida request, extrai auth               │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                             │                                       │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │  Camada de Aplicação (Orquestração)                         │    │
│  │  ChatService → monta prompt, gerencia memória,              │    │
│  │                chama ChatClient, processa resultado          │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                             │                                       │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │  Camada de Ferramentas (Tools)                              │    │
│  │  ┌──────────────┐ ┌────────────────┐ ┌─────────────────┐   │    │
│  │  │ ConsultaTools│ │ LancamentoTools│ │ RelatorioTools   │   │    │
│  │  │ (7 funções)  │ │ (5 funções)    │ │ (1 função)       │   │    │
│  │  └──────┬───────┘ └───────┬────────┘ └────────┬────────┘   │    │
│  └─────────┼─────────────────┼───────────────────┼─────────────┘    │
│            │                 │                   │                   │
│  ┌─────────▼─────────────────▼───────────────────▼─────────────┐    │
│  │  Camada de Domínio (Services existentes)                    │    │
│  │  DashboardService, ContaService, CartaoCreditoService,      │    │
│  │  ContaCorrenteService, InvestimentoService, CategoriaService│    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                             │                                       │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │  Camada de Infraestrutura                                   │    │
│  │  JPA Repositories → PostgreSQL (filtro por usuarioId)       │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Princípio Fundamental de Segurança

**O LLM nunca recebe `usuarioId` como parâmetro.** O isolamento multi-tenant ocorre exatamente da mesma forma que em todos os endpoints existentes: o `SecurityContextUtils` (bean `@RequestScope`) extrai o usuário do JWT. Cada tool é um bean Spring que recebe `SecurityContextUtils` por injeção — o LLM simplesmente não tem como operar dados de outro usuário.

---

## 2. Princípios e Padrões Adotados

### 2.1 SOLID nos Tools

- **Single Responsibility**: Cada classe de tool tem uma única responsabilidade (consultas, lançamentos ou relatórios). Não existe um "mega tool" que faz tudo.
- **Open/Closed**: Novos tools são adicionados criando novas classes `@Component` — sem modificar o `ChatService` ou o `ChatController`.
- **Liskov Substitution**: Todos os tools seguem o contrato `Function<TInput, TOutput>` do Spring AI.
- **Interface Segregation**: Os tools de consulta não dependem dos services de escrita, e vice-versa.
- **Dependency Inversion**: Os tools dependem das interfaces dos Services, não de implementações concretas.

### 2.2 Padrões de Projeto Aplicados

| Padrão | Onde | Por quê |
|--------|------|---------|
| **Strategy** | `ChatModelAdapter` no frontend | Permite trocar o backend (REST → SSE → WebSocket) sem alterar os componentes de UI |
| **Facade** | `ChatService` | Orquestra múltiplos subsistemas (ChatClient, memória, tools) atrás de uma interface simples |
| **Template Method** | `SystemPromptBuilder` | Define a estrutura do prompt com pontos de extensão para contexto dinâmico |
| **Observer** | assistant-ui `LocalRuntime` | O runtime notifica os componentes reativamente quando o estado muda |
| **Factory Method** | `ToolRegistrar` | Centraliza o registro de tools como beans Spring, permitindo descoberta automática |
| **Builder** | DTOs de request/response | Records imutáveis com validação; construtores fluentes onde necessário |

### 2.3 Convenções de Código

**Backend (Java):**
- Pacotes organizados por feature (não por tipo): `chat/controller`, `chat/service`, `chat/tools`
- Records para DTOs; classes para entidades
- Métodos de service anotados com `@Transactional(readOnly = true)` para leitura
- Javadoc em todos os métodos públicos dos tools (o LLM não lê Javadoc, mas o dev sim)
- Sem lógica de negócio nos tools — eles apenas delegam para Services existentes

**Frontend (React):**
- Componentes de chat isolados em `src/components/chat/`
- Hook `useChatRuntime` encapsula toda a configuração do assistant-ui
- Tool UIs como componentes independentes registrados via `makeAssistantToolUI`
- Sem TypeScript no MVP (consistente com o projeto atual), mas com JSDoc types nos hooks críticos

---

## 3. Fase 1 — Preparação do Ambiente

**Duração estimada: 1–2 dias**

### 3.1 Backend — Dependências

Adicionar ao `core4erp/build.gradle`:

```gradle
// ── Spring AI ────────────────────────────────────────────
implementation platform('org.springframework.ai:spring-ai-bom:1.0.0')
implementation 'org.springframework.ai:spring-ai-openai-spring-boot-starter'

// ── Geração de Excel ─────────────────────────────────────
implementation 'org.apache.poi:poi-ooxml:5.3.0'
```

> **Nota sobre troca de provider:** Para usar Anthropic em vez de OpenAI, substitua
> o starter por `spring-ai-anthropic-spring-boot-starter`. O código dos tools
> não muda — apenas a configuração.

### 3.2 Backend — Variáveis de Ambiente

Adicionar ao `core4erp/.env.example`:

```properties
# AI Chat — LLM Provider
OPENAI_API_KEY=sk-your-key-here

# Alternativa Anthropic (descomente se usar):
# ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Adicionar ao `core4erp/src/main/resources/application.properties`:

```properties
# ── Spring AI ─────────────────────────────────────────────
spring.ai.openai.api-key=${OPENAI_API_KEY}
spring.ai.openai.chat.options.model=gpt-4o
spring.ai.openai.chat.options.temperature=0.1

# ── Chat ──────────────────────────────────────────────────
chat.memory.max-messages=20
chat.relatorios.dir=${java.io.tmpdir}/core4erp-relatorios
chat.relatorios.ttl-minutes=60
```

Adicionar `OPENAI_API_KEY` à lista de chaves no `EnvConfig.java`:

```java
// EnvConfig.java — adicionar à lista de keys
for (String key : new String[]{
    "DB_URL", "DB_USERNAME", "DB_PASSWORD",
    "SECRET_KEY", "CORS_ORIGINS", "TOKEN_EXPIRATION",
    "OPENAI_API_KEY"  // ← novo
}) { ... }
```

### 3.3 Frontend — Dependências

```bash
cd front-end
npm install @assistant-ui/react @assistant-ui/react-markdown
```

### 3.4 Estrutura de Pacotes (Backend)

Criar a seguinte estrutura de diretórios:

```
core4erp/src/main/java/br/com/core4erp/
└── chat/
    ├── controller/
    │   └── ChatController.java
    ├── dto/
    │   ├── ChatRequestDto.java
    │   └── ChatResponseDto.java
    ├── service/
    │   ├── ChatService.java
    │   └── SystemPromptBuilder.java
    ├── tools/
    │   ├── consulta/
    │   │   └── ConsultaTools.java
    │   ├── lancamento/
    │   │   └── LancamentoTools.java
    │   └── relatorio/
    │       ├── RelatorioTools.java
    │       └── RelatorioExcelService.java
    └── config/
        └── ChatAiConfig.java
```

### 3.5 Estrutura de Diretórios (Frontend)

```
front-end/src/
├── components/
│   └── chat/
│       ├── ChatSidebar.jsx          # Drawer lateral com o Thread
│       ├── ConfirmacaoToolUI.jsx     # Card de confirmação de lançamento
│       ├── RelatorioToolUI.jsx       # Link de download de relatório
│       └── SaldoToolUI.jsx           # Card visual de saldos
├── hooks/
│   └── useChatRuntime.js            # Configuração do LocalRuntime
└── lib/
    └── api.js                       # (adicionar endpoint chat)
```

### 3.6 Critério de Aceite da Fase 1

- [ ] `./gradlew compileJava` compila sem erros com as novas dependências
- [ ] `npm install` no frontend instala assistant-ui sem conflitos
- [ ] Estrutura de pacotes criada (ainda sem implementação)
- [ ] Variáveis de ambiente configuradas e documentadas

---

## 4. Fase 2 — Camada de Domínio do Chat (Backend)

**Duração estimada: 2–3 dias**

### 4.1 DTOs

**`ChatRequestDto.java`**

```java
package br.com.core4erp.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChatRequestDto(
    @NotBlank(message = "Mensagem é obrigatória")
    @Size(max = 4000, message = "Mensagem deve ter no máximo 4000 caracteres")
    String mensagem
) {}
```

> Sem `conversaId` no DTO: a memória é gerenciada por sessão HTTP no backend
> via `@RequestScope` ou `ConcurrentHashMap`. O frontend não precisa
> rastrear IDs de conversa — o assistant-ui `LocalRuntime` gerencia o
> histórico localmente.

**`ChatResponseDto.java`**

```java
package br.com.core4erp.chat.dto;

import java.util.List;
import java.util.Map;

public record ChatResponseDto(
    String resposta,
    String downloadUrl,
    List<ToolCallDto> toolCalls
) {
    public record ToolCallDto(
        String toolName,
        String toolCallId,
        Map<String, Object> args,
        Object result
    ) {}
}
```

### 4.2 SystemPromptBuilder

**`SystemPromptBuilder.java`**

```java
package br.com.core4erp.chat.service;

import br.com.core4erp.usuario.entity.Usuario;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Constrói o system prompt com contexto dinâmico do usuário autenticado.
 *
 * O prompt define as regras de comportamento do assistente, incluindo:
 * - Identidade e tom de comunicação
 * - Regras de formatação de valores e datas
 * - Restrições de segurança (nunca aceitar usuarioId)
 * - Fluxo obrigatório de confirmação para operações de escrita
 */
@Component
public class SystemPromptBuilder {

    private static final DateTimeFormatter BR_DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public String build(Usuario usuario) {
        return """
            Você é o C4 Assistant, assistente financeiro do Core 4 ERP.

            ## CONTEXTO
            - Usuário: %s (email: %s)
            - Data de hoje: %s
            - Moeda: BRL (Real Brasileiro)
            - Fuso horário: America/Sao_Paulo

            ## REGRAS DE FORMATAÇÃO
            - Para as ferramentas (tools), use valores numéricos (250.00) e datas ISO (2026-05-15).
            - Nas respostas ao usuário, use formato brasileiro: R$ 250,00 e 15/05/2026.
            - Use separador de milhares: R$ 1.250,00.

            ## REGRAS DE SEGURANÇA (INVIOLÁVEIS)
            1. NUNCA peça ou aceite um ID de usuário. O sistema já sabe quem você é.
            2. NUNCA invente dados. Se uma consulta retorna vazio, diga claramente.
            3. NUNCA execute operações de escrita sem confirmação explícita do usuário.

            ## FLUXO DE OPERAÇÕES DE ESCRITA
            Quando o usuário pedir para registrar algo:
            1. Extraia os dados da mensagem.
            2. Se faltar informação (categoria, data, valor), PERGUNTE antes de prosseguir.
            3. Se não souber o ID da categoria, use consultarCategorias primeiro.
            4. Apresente um RESUMO claro dos dados e peça confirmação.
            5. Somente após "sim", "confirma", "pode registrar" ou equivalente, execute a operação.

            ## FLUXO DE RELATÓRIOS
            1. Confirme o tipo de relatório e o período com o usuário.
            2. Gere o relatório e informe que o download está disponível.

            ## TOM DE COMUNICAÇÃO
            - Seja conciso e direto.
            - Use linguagem profissional mas acessível.
            - Não use emojis.
            - Quando apresentar valores, destaque os números importantes.
            """.formatted(
                usuario.getNome(),
                usuario.getEmail(),
                LocalDate.now().format(BR_DATE)
            );
    }
}
```

### 4.3 ChatService (Orquestrador)

**`ChatService.java`**

```java
package br.com.core4erp.chat.service;

import br.com.core4erp.chat.dto.ChatRequestDto;
import br.com.core4erp.chat.dto.ChatResponseDto;
import br.com.core4erp.config.security.SecurityContextUtils;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Orquestrador central do chat com IA.
 *
 * Responsabilidades:
 * - Manter o histórico de conversa por sessão de usuário
 * - Montar o system prompt com contexto dinâmico
 * - Delegar ao ChatClient do Spring AI (que gerencia tools automaticamente)
 * - Traduzir a resposta do LLM para o DTO de saída
 *
 * Não contém lógica de negócio — apenas orquestração.
 */
@Service
public class ChatService {

    private final ChatClient chatClient;
    private final SystemPromptBuilder promptBuilder;
    private final SecurityContextUtils securityCtx;

    // Memória in-memory por email do usuário.
    // Em produção, substituir por Redis com TTL.
    private final Map<String, List<Message>> memoriaConversas = new ConcurrentHashMap<>();

    private static final int MAX_HISTORICO = 20;

    public ChatService(ChatClient.Builder chatClientBuilder,
                       SystemPromptBuilder promptBuilder,
                       SecurityContextUtils securityCtx) {
        // O ChatClient.Builder é auto-configurado pelo Spring AI starter.
        // Os tools registrados como @Bean Function<> são descobertos automaticamente.
        this.chatClient = chatClientBuilder.build();
        this.promptBuilder = promptBuilder;
        this.securityCtx = securityCtx;
    }

    /**
     * Processa uma mensagem do usuário e retorna a resposta do assistente.
     *
     * Fluxo:
     * 1. Recupera ou inicializa o histórico de conversa
     * 2. Monta o system prompt com dados do usuário autenticado
     * 3. Envia ao LLM via ChatClient (Spring AI executa tools se necessário)
     * 4. Atualiza o histórico com a nova interação
     * 5. Retorna a resposta formatada
     */
    public ChatResponseDto processar(ChatRequestDto request) {
        String email = securityCtx.getEmail();
        String systemPrompt = promptBuilder.build(securityCtx.getUsuario());

        // Recuperar histórico ou iniciar nova conversa
        List<Message> historico = memoriaConversas
                .computeIfAbsent(email, k -> new ArrayList<>());

        // Adicionar mensagem do usuário ao histórico
        historico.add(new UserMessage(request.mensagem()));

        // Montar a chamada ao LLM
        ChatResponse response = chatClient.prompt()
                .system(systemPrompt)
                .messages(historico)
                .call()
                .chatResponse();

        // Extrair resposta textual
        String respostaTexto = response.getResult().getOutput().getText();

        // Adicionar resposta do assistente ao histórico
        historico.add(new AssistantMessage(respostaTexto));

        // Manter janela de histórico dentro do limite
        podarHistorico(historico);

        // Extrair URL de download se houver (convenção: tools de relatório
        // retornam um Map com chave "downloadUrl")
        String downloadUrl = extrairDownloadUrl(respostaTexto);

        return new ChatResponseDto(respostaTexto, downloadUrl, List.of());
    }

    /**
     * Limpa o histórico de conversa do usuário autenticado.
     */
    public void limparHistorico() {
        memoriaConversas.remove(securityCtx.getEmail());
    }

    /**
     * Mantém apenas as últimas MAX_HISTORICO mensagens para evitar
     * estouro de contexto do LLM.
     */
    private void podarHistorico(List<Message> historico) {
        while (historico.size() > MAX_HISTORICO) {
            historico.remove(0);
        }
    }

    private String extrairDownloadUrl(String resposta) {
        // Convenção: o tool de relatório inclui a URL no texto
        if (resposta != null && resposta.contains("/api/chat/relatorios/")) {
            int inicio = resposta.indexOf("/api/chat/relatorios/");
            int fim = resposta.indexOf(".xlsx", inicio);
            if (fim > inicio) {
                return resposta.substring(inicio, fim + 5);
            }
        }
        return null;
    }
}
```

### 4.4 ChatController

**`ChatController.java`**

```java
package br.com.core4erp.chat.controller;

import br.com.core4erp.chat.dto.ChatRequestDto;
import br.com.core4erp.chat.dto.ChatResponseDto;
import br.com.core4erp.chat.service.ChatService;
import br.com.core4erp.chat.tools.relatorio.RelatorioExcelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Chat IA", description = "Assistente financeiro com inteligência artificial")
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;
    private final RelatorioExcelService relatorioService;

    public ChatController(ChatService chatService,
                          RelatorioExcelService relatorioService) {
        this.chatService = chatService;
        this.relatorioService = relatorioService;
    }

    @Operation(summary = "Enviar mensagem ao assistente de IA")
    @PostMapping
    public ResponseEntity<ChatResponseDto> enviarMensagem(
            @Valid @RequestBody ChatRequestDto request) {
        return ResponseEntity.ok(chatService.processar(request));
    }

    @Operation(summary = "Limpar histórico de conversa")
    @DeleteMapping("/historico")
    public ResponseEntity<Void> limparHistorico() {
        chatService.limparHistorico();
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Download de relatório gerado pelo chat")
    @GetMapping("/relatorios/{fileName}")
    public ResponseEntity<Resource> downloadRelatorio(
            @PathVariable String fileName,
            Authentication auth) {
        Resource file = relatorioService.getRelatorio(auth.getName(), fileName);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(file);
    }
}
```

### 4.5 Configuração do Spring AI

**`ChatAiConfig.java`**

```java
package br.com.core4erp.chat.config;

import org.springframework.context.annotation.Configuration;

/**
 * Configuração do Spring AI.
 *
 * O Spring AI auto-configura o ChatClient.Builder via starter.
 * Os tools são descobertos automaticamente como beans do tipo
 * Function<?, ?> anotados com @Bean e @Description.
 *
 * Esta classe existe como ponto de extensão para configurações
 * futuras (ex: custom advisors, retry policies, model overrides).
 */
@Configuration
public class ChatAiConfig {
    // A auto-configuração do Spring AI resolve tudo via application.properties.
    // Beans adicionais serão adicionados aqui conforme necessidade.
}
```

### 4.6 Registrar endpoint no SecurityConfig

Adicionar `/api/chat/**` como rota autenticada (já está coberto pelo `anyRequest().authenticated()`, mas vale registrar no Swagger):

```java
// SecurityConfig.java — nenhuma alteração necessária.
// O endpoint /api/chat já está protegido por anyRequest().authenticated().
// O JWT cookie é enviado automaticamente pelo frontend via credentials: 'include'.
```

### 4.7 Critério de Aceite da Fase 2

- [ ] `POST /api/chat` com body `{"mensagem": "Olá"}` retorna uma resposta do LLM
- [ ] O system prompt contém o nome e email do usuário autenticado
- [ ] Mensagens consecutivas mantêm contexto (memória de conversa funciona)
- [ ] `DELETE /api/chat/historico` limpa a conversa
- [ ] Usuário não autenticado recebe 401

---

## 5. Fase 3 — Tools de Consulta (Leitura)

**Duração estimada: 2–3 dias**

### 5.1 Princípio: Tools Delegam, Não Implementam

Cada tool é uma função que traduz a "intenção do LLM" para uma chamada ao Service existente. Zero lógica de negócio nos tools.

### 5.2 ConsultaTools

**`ConsultaTools.java`**

```java
package br.com.core4erp.chat.tools.consulta;

import br.com.core4erp.categoria.dto.CategoriaResponseDto;
import br.com.core4erp.categoria.service.CategoriaService;
import br.com.core4erp.contaCorrente.dto.ContaCorrenteResponseDto;
import br.com.core4erp.contaCorrente.service.ContaCorrenteService;
import br.com.core4erp.dashboard.dto.DashboardResponseDto;
import br.com.core4erp.dashboard.service.DashboardService;
import br.com.core4erp.cartaoCredito.dto.CartaoCreditoResponseDto;
import br.com.core4erp.cartaoCredito.service.CartaoCreditoService;
import br.com.core4erp.investimento.dto.ContaInvestimentoResponseDto;
import br.com.core4erp.investimento.service.InvestimentoService;
import br.com.core4erp.notificacao.dto.NotificacaoResponseDto;
import br.com.core4erp.notificacao.service.NotificacaoService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Description;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.function.Function;

/**
 * Tools de consulta (somente leitura) disponíveis para o assistente de IA.
 *
 * Cada bean é descoberto automaticamente pelo Spring AI e registrado
 * como uma função que o LLM pode invocar via Function Calling.
 *
 * A anotação @Description é o que o LLM "lê" para decidir quando usar o tool.
 * Quanto mais clara e específica a descrição, melhor o roteamento.
 */
@Configuration
public class ConsultaTools {

    private final DashboardService dashboardService;
    private final ContaCorrenteService contaCorrenteService;
    private final CategoriaService categoriaService;
    private final CartaoCreditoService cartaoCreditoService;
    private final InvestimentoService investimentoService;
    private final NotificacaoService notificacaoService;

    public ConsultaTools(DashboardService dashboardService,
                         ContaCorrenteService contaCorrenteService,
                         CategoriaService categoriaService,
                         CartaoCreditoService cartaoCreditoService,
                         InvestimentoService investimentoService,
                         NotificacaoService notificacaoService) {
        this.dashboardService = dashboardService;
        this.contaCorrenteService = contaCorrenteService;
        this.categoriaService = categoriaService;
        this.cartaoCreditoService = cartaoCreditoService;
        this.investimentoService = investimentoService;
        this.notificacaoService = notificacaoService;
    }

    @Bean
    @Description("""
        Retorna o resumo financeiro completo do usuário:
        saldo total das contas correntes, total a pagar (pendente + atrasado),
        total a receber, patrimônio em investimentos, limite total e usado
        dos cartões de crédito, fluxo de caixa dos últimos 6 meses
        (receitas recebidas vs despesas pagas por mês), top 5 despesas
        por categoria do mês atual, quantidade de contas vencendo hoje
        e quantidade de contas atrasadas.
        Use esta ferramenta para responder perguntas como:
        "Qual meu saldo?", "Como estão minhas finanças?",
        "Quanto tenho a pagar?", "Resumo financeiro".
        """)
    public Function<Void, DashboardResponseDto> consultarDashboard() {
        return ignored -> dashboardService.getDashboard();
    }

    @Bean
    @Description("""
        Lista todas as contas correntes do usuário com: id, número da conta,
        agência, descrição e saldo atual. Use para responder perguntas como:
        "Quais são minhas contas?", "Qual o saldo da conta X?",
        "Em qual conta tenho mais dinheiro?".
        """)
    public Function<Void, List<ContaCorrenteResponseDto>> consultarContasCorrentes() {
        return ignored -> contaCorrenteService.listar();
    }

    @Bean
    @Description("""
        Lista todas as categorias de despesa e receita disponíveis para o
        usuário, com id, descrição e ícone. IMPORTANTE: use esta ferramenta
        ANTES de registrar qualquer lançamento para descobrir o categoriaId
        correto. Nunca invente um categoriaId.
        """)
    public Function<Void, List<CategoriaResponseDto>> consultarCategorias() {
        Pageable pageable = PageRequest.of(0, 200, Sort.by("descricao"));
        return ignored -> categoriaService.listar(pageable).getContent();
    }

    @Bean
    @Description("""
        Lista os cartões de crédito do usuário com: id, nome, limite total,
        limite usado, limite livre, dia de fechamento e dia de vencimento.
        Use para perguntas como: "Quais meus cartões?",
        "Quanto tenho de limite?", "Qual cartão tem mais limite livre?".
        """)
    public Function<Void, List<CartaoCreditoResponseDto>> consultarCartoes() {
        Pageable pageable = PageRequest.of(0, 200, Sort.by("nome"));
        return ignored -> cartaoCreditoService.listar(pageable).getContent();
    }

    @Bean
    @Description("""
        Lista as carteiras de investimento do usuário com: id, nome, tipo
        (RENDA_FIXA, RENDA_VARIAVEL, FUNDOS, CRIPTO, OUTROS) e saldo atual.
        Use para: "Quanto tenho investido?", "Quais meus investimentos?".
        """)
    public Function<Void, List<ContaInvestimentoResponseDto>> consultarInvestimentos() {
        return ignored -> investimentoService.listar();
    }

    @Bean
    @Description("""
        Lista as notificações não lidas do usuário (alertas de contas
        vencidas e faturas de cartão). Use para: "Tenho notificações?",
        "Algum alerta?", "O que preciso pagar?".
        """)
    public Function<Void, List<NotificacaoResponseDto>> consultarNotificacoes() {
        return ignored -> notificacaoService.listarNaoLidas();
    }
}
```

### 5.3 Critério de Aceite da Fase 3

- [ ] "Qual meu saldo?" → LLM invoca `consultarDashboard` e responde com o saldo em formato BR
- [ ] "Quais minhas categorias?" → LLM lista as categorias do usuário
- [ ] "Tenho notificações?" → LLM retorna alertas pendentes
- [ ] "Quanto tenho de limite no cartão?" → LLM consulta cartões e responde
- [ ] Todas as consultas respeitam o isolamento por `usuarioId`

---

## 6. Fase 4 — Tools de Lançamento (Escrita + Confirmação)

**Duração estimada: 3–4 dias**

### 6.1 LancamentoTools

**`LancamentoTools.java`**

```java
package br.com.core4erp.chat.tools.lancamento;

import br.com.core4erp.conta.dto.ContaCreateDto;
import br.com.core4erp.conta.dto.ContaResponseDto;
import br.com.core4erp.conta.dto.BaixaRequestDto;
import br.com.core4erp.conta.service.ContaService;
import br.com.core4erp.contaCorrente.dto.TransferenciaRequestDto;
import br.com.core4erp.contaCorrente.service.ContaCorrenteService;
import br.com.core4erp.cartaoCredito.dto.LancamentoRequestDto;
import br.com.core4erp.cartaoCredito.dto.LancamentoResponseDto;
import br.com.core4erp.cartaoCredito.service.CartaoCreditoService;
import br.com.core4erp.enums.TipoConta;
import br.com.core4erp.investimento.dto.TransacaoInvestimentoRequestDto;
import br.com.core4erp.investimento.dto.TransacaoInvestimentoResponseDto;
import br.com.core4erp.investimento.service.InvestimentoService;
import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Description;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * Tools de escrita (lançamentos) disponíveis para o assistente de IA.
 *
 * REGRA CRÍTICA: O system prompt instrui o LLM a sempre pedir confirmação
 * antes de invocar estes tools. A confirmação acontece no nível do LLM
 * (ele pergunta ao usuário e só executa após receber "sim").
 *
 * Se uma camada adicional de confirmação for necessária (human-in-the-loop
 * via UI), ela será implementada no frontend com makeAssistantToolUI.
 */
@Configuration
public class LancamentoTools {

    private final ContaService contaService;
    private final ContaCorrenteService contaCorrenteService;
    private final CartaoCreditoService cartaoCreditoService;
    private final InvestimentoService investimentoService;

    public LancamentoTools(ContaService contaService,
                           ContaCorrenteService contaCorrenteService,
                           CartaoCreditoService cartaoCreditoService,
                           InvestimentoService investimentoService) {
        this.contaService = contaService;
        this.contaCorrenteService = contaCorrenteService;
        this.cartaoCreditoService = cartaoCreditoService;
        this.investimentoService = investimentoService;
    }

    // ── Records de parâmetros ─────────────────────────────────────

    public record RegistrarContaParams(
        @JsonPropertyDescription("Descrição da conta. Ex: 'Conta de Luz', 'Salário'")
        String descricao,

        @JsonPropertyDescription("Valor em reais. Ex: 250.00")
        BigDecimal valorOriginal,

        @JsonPropertyDescription("Data de vencimento no formato YYYY-MM-DD")
        LocalDate dataVencimento,

        @JsonPropertyDescription("PAGAR para despesas, RECEBER para receitas")
        String tipo,

        @JsonPropertyDescription("ID da categoria. Use consultarCategorias para descobrir o ID correto")
        Long categoriaId,

        @JsonPropertyDescription("ID do parceiro/fornecedor. Opcional, pode ser null")
        Long parceiroId,

        @JsonPropertyDescription("Número de parcelas. Padrão: 1")
        Integer quantidadeParcelas,

        @JsonPropertyDescription("Se true, divide o valor total entre as parcelas")
        Boolean dividirValor
    ) {}

    public record LancamentoCartaoParams(
        @JsonPropertyDescription("ID do cartão de crédito. Use consultarCartoes para descobrir")
        Long cartaoId,

        @JsonPropertyDescription("Descrição da compra")
        String descricao,

        @JsonPropertyDescription("Valor da compra em reais")
        BigDecimal valor,

        @JsonPropertyDescription("Data da compra no formato YYYY-MM-DD")
        LocalDate dataCompra,

        @JsonPropertyDescription("Mês da fatura (1-12)")
        Integer mesFatura,

        @JsonPropertyDescription("Ano da fatura. Ex: 2026")
        Integer anoFatura,

        @JsonPropertyDescription("ID da categoria")
        Long categoriaId,

        @JsonPropertyDescription("Número de parcelas. Padrão: 1")
        Integer quantidadeParcelas
    ) {}

    public record TransferenciaParams(
        @JsonPropertyDescription("ID da conta corrente de origem")
        Long contaOrigemId,

        @JsonPropertyDescription("ID da conta corrente de destino")
        Long contaDestinoId,

        @JsonPropertyDescription("Valor a transferir em reais")
        BigDecimal valor
    ) {}

    public record BaixaContaParams(
        @JsonPropertyDescription("ID da conta a ser baixada")
        Long contaId,

        @JsonPropertyDescription("ID da conta corrente para débito/crédito")
        Long contaCorrenteId,

        @JsonPropertyDescription("Data do pagamento/recebimento no formato YYYY-MM-DD")
        LocalDate dataPagamento,

        @JsonPropertyDescription("Valor de juros. Padrão: 0")
        BigDecimal juros,

        @JsonPropertyDescription("Valor de multa. Padrão: 0")
        BigDecimal multa
    ) {}

    public record TransacaoInvestimentoParams(
        @JsonPropertyDescription("ID da conta de investimento")
        Long contaInvestimentoId,

        @JsonPropertyDescription("APORTE, RESGATE ou RENDIMENTO")
        String tipoTransacao,

        @JsonPropertyDescription("Valor da transação em reais")
        BigDecimal valor,

        @JsonPropertyDescription("Data da transação no formato YYYY-MM-DD")
        LocalDate dataTransacao,

        @JsonPropertyDescription("ID da conta corrente para débito (apenas para APORTE). Opcional")
        Long contaCorrenteOrigemId
    ) {}

    // ── Beans de Tools ────────────────────────────────────────────

    @Bean
    @Description("""
        Registra uma nova conta a pagar ou a receber. ANTES de chamar,
        o assistente DEVE ter confirmado os dados com o usuário.
        Se não souber o categoriaId, use consultarCategorias primeiro.
        Retorna a lista de contas criadas (pode ser mais de uma se parcelado).
        """)
    public Function<RegistrarContaParams, List<ContaResponseDto>> registrarConta() {
        return params -> {
            TipoConta tipo = TipoConta.valueOf(params.tipo());
            ContaCreateDto dto = new ContaCreateDto(
                params.descricao(), params.valorOriginal(), params.dataVencimento(),
                tipo, params.categoriaId(), params.parceiroId(),
                params.quantidadeParcelas() != null ? params.quantidadeParcelas() : 1,
                1, // intervaloMeses
                Boolean.TRUE.equals(params.dividirValor()),
                null, null, null // doc, acrescimo, desconto
            );
            return contaService.criar(dto);
        };
    }

    @Bean
    @Description("""
        Registra um lançamento em cartão de crédito. Suporta parcelamento.
        Use consultarCartoes para obter o cartaoId e consultarCategorias
        para o categoriaId. CONFIRME os dados antes de executar.
        """)
    public Function<LancamentoCartaoParams, List<LancamentoResponseDto>> registrarLancamentoCartao() {
        return params -> {
            LancamentoRequestDto dto = new LancamentoRequestDto(
                params.descricao(), params.valor(), params.dataCompra(),
                params.mesFatura(), params.anoFatura(), params.categoriaId(),
                params.quantidadeParcelas() != null ? params.quantidadeParcelas() : 1,
                true // dividirValor
            );
            return cartaoCreditoService.criarLancamento(params.cartaoId(), dto);
        };
    }

    @Bean
    @Description("""
        Transfere um valor entre duas contas correntes do usuário.
        Use consultarContasCorrentes para obter os IDs das contas.
        """)
    public Function<TransferenciaParams, Map<String, String>> transferirEntreContas() {
        return params -> {
            TransferenciaRequestDto dto = new TransferenciaRequestDto(
                params.contaOrigemId(), params.contaDestinoId(), params.valor()
            );
            contaCorrenteService.transferir(dto);
            return Map.of("status", "Transferência realizada com sucesso");
        };
    }

    @Bean
    @Description("""
        Registra o pagamento (baixa) de uma conta a pagar ou o recebimento
        de uma conta a receber. Move o saldo da conta corrente informada.
        """)
    public Function<BaixaContaParams, ContaResponseDto> baixarConta() {
        return params -> {
            BaixaRequestDto dto = new BaixaRequestDto(
                params.contaCorrenteId(), params.dataPagamento(),
                params.juros() != null ? params.juros() : BigDecimal.ZERO,
                params.multa() != null ? params.multa() : BigDecimal.ZERO,
                BigDecimal.ZERO, BigDecimal.ZERO
            );
            return contaService.baixar(params.contaId(), dto);
        };
    }

    @Bean
    @Description("""
        Registra uma transação em conta de investimento: APORTE (adiciona),
        RESGATE (retira) ou RENDIMENTO (rendimento creditado).
        Se for APORTE, pode debitar de uma conta corrente.
        """)
    public Function<TransacaoInvestimentoParams, TransacaoInvestimentoResponseDto> registrarTransacaoInvestimento() {
        return params -> {
            TransacaoInvestimentoRequestDto dto = new TransacaoInvestimentoRequestDto(
                br.com.core4erp.enums.TipoTransacaoInvestimento.valueOf(params.tipoTransacao()),
                params.valor(), params.dataTransacao(), params.contaCorrenteOrigemId()
            );
            return investimentoService.registrarTransacao(params.contaInvestimentoId(), dto);
        };
    }
}
```

### 6.2 Critério de Aceite da Fase 4

- [ ] "Registra uma conta de luz de R$ 200 pra dia 15/05" → LLM pede confirmação, após "sim" persiste
- [ ] "Lança R$ 50 no cartão Nubank em alimentação" → LLM consulta categorias e cartões antes
- [ ] "Transfere R$ 500 da conta principal pra poupança" → executa transferência
- [ ] "Paga a conta #5 na conta corrente principal" → registra baixa
- [ ] Tentativa de lançar sem categoria → LLM pergunta qual categoria usar

---

## 7. Fase 5 — Tool de Relatório (Geração de Excel)

**Duração estimada: 2–3 dias**

### 7.1 RelatorioExcelService

**`RelatorioExcelService.java`**

```java
package br.com.core4erp.chat.tools.relatorio;

import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.conta.entity.Conta;
import br.com.core4erp.conta.repository.ContaRepository;
import br.com.core4erp.enums.TipoConta;
import jakarta.annotation.PostConstruct;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Gera relatórios financeiros em formato Excel (.xlsx).
 *
 * Os arquivos são salvos em diretório temporário com TTL configurável.
 * Um job agendado limpa arquivos expirados a cada hora.
 *
 * Segurança: o nome do arquivo inclui um UUID e o email do usuário
 * (hash), impedindo que um usuário acesse o relatório de outro.
 */
@Service
public class RelatorioExcelService {

    private final ContaRepository contaRepository;
    private final SecurityContextUtils securityCtx;

    @Value("${chat.relatorios.dir}")
    private String relatoriosDir;

    @Value("${chat.relatorios.ttl-minutes:60}")
    private int ttlMinutes;

    public RelatorioExcelService(ContaRepository contaRepository,
                                  SecurityContextUtils securityCtx) {
        this.contaRepository = contaRepository;
        this.securityCtx = securityCtx;
    }

    @PostConstruct
    public void init() throws IOException {
        Files.createDirectories(Path.of(relatoriosDir));
    }

    /**
     * Gera um relatório de contas (despesas ou receitas) no período informado.
     *
     * @return nome do arquivo gerado (UUID + .xlsx)
     */
    public String gerarRelatorioDespesas(LocalDate inicio, LocalDate fim) {
        Long uid = securityCtx.getUsuarioId();
        var contas = contaRepository.findAllByUsuarioId(uid,
                PageRequest.of(0, 10000)).getContent().stream()
                .filter(c -> !c.getDataVencimento().isBefore(inicio)
                          && !c.getDataVencimento().isAfter(fim))
                .toList();

        String fileName = UUID.randomUUID() + ".xlsx";
        Path filePath = Path.of(relatoriosDir, fileName);

        try (Workbook wb = new XSSFWorkbook();
             FileOutputStream out = new FileOutputStream(filePath.toFile())) {

            Sheet sheet = wb.createSheet("Relatório");

            // Cabeçalho
            Row header = sheet.createRow(0);
            CellStyle headerStyle = wb.createCellStyle();
            Font headerFont = wb.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            String[] colunas = {"Descrição", "Valor (R$)", "Vencimento",
                                "Tipo", "Status", "Categoria", "Parcela"};
            for (int i = 0; i < colunas.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(colunas[i]);
                cell.setCellStyle(headerStyle);
            }

            // Dados
            int rowNum = 1;
            for (Conta conta : contas) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(conta.getDescricao());
                row.createCell(1).setCellValue(conta.getValorOriginal().doubleValue());
                row.createCell(2).setCellValue(conta.getDataVencimento().toString());
                row.createCell(3).setCellValue(conta.getTipo().name());
                row.createCell(4).setCellValue(conta.getStatus().name());
                row.createCell(5).setCellValue(conta.getCategoria().getDescricao());
                row.createCell(6).setCellValue(
                    conta.getNumeroParcela() + "/" + conta.getTotalParcelas());
            }

            // Auto-size colunas
            for (int i = 0; i < colunas.length; i++) {
                sheet.autoSizeColumn(i);
            }

            wb.write(out);
        } catch (IOException e) {
            throw new RuntimeException("Erro ao gerar relatório Excel", e);
        }

        return fileName;
    }

    /**
     * Retorna o arquivo de relatório para download.
     * Valida que o arquivo existe e pertence ao diretório configurado.
     */
    public Resource getRelatorio(String email, String fileName) {
        // Sanitização: impedir path traversal
        if (fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
            throw new IllegalArgumentException("Nome de arquivo inválido");
        }

        Path filePath = Path.of(relatoriosDir, fileName);
        if (!Files.exists(filePath)) {
            throw new jakarta.persistence.EntityNotFoundException(
                "Relatório não encontrado ou expirado: " + fileName);
        }

        return new FileSystemResource(filePath);
    }

    /**
     * Limpa relatórios expirados a cada hora.
     */
    @Scheduled(fixedRate = 3600000)
    public void limparRelatoriosExpirados() {
        try {
            LocalDateTime limite = LocalDateTime.now().minusMinutes(ttlMinutes);
            Files.list(Path.of(relatoriosDir))
                .filter(p -> {
                    try {
                        return Files.getLastModifiedTime(p).toInstant()
                            .isBefore(limite.atZone(java.time.ZoneId.systemDefault()).toInstant());
                    } catch (IOException e) { return false; }
                })
                .forEach(p -> { try { Files.delete(p); } catch (IOException ignored) {} });
        } catch (IOException ignored) {}
    }
}
```

### 7.2 RelatorioTools

**`RelatorioTools.java`**

```java
package br.com.core4erp.chat.tools.relatorio;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Description;

import java.time.LocalDate;
import java.util.Map;
import java.util.function.Function;

@Configuration
public class RelatorioTools {

    private final RelatorioExcelService excelService;

    public RelatorioTools(RelatorioExcelService excelService) {
        this.excelService = excelService;
    }

    public record GerarRelatorioParams(
        @JsonPropertyDescription("Data de início do relatório no formato YYYY-MM-DD")
        LocalDate dataInicio,

        @JsonPropertyDescription("Data de fim do relatório no formato YYYY-MM-DD")
        LocalDate dataFim
    ) {}

    @Bean
    @Description("""
        Gera um relatório financeiro em formato Excel (.xlsx) para download.
        O relatório contém todas as contas (a pagar e a receber) do período
        informado, com descrição, valor, vencimento, tipo, status, categoria
        e parcela. Retorna a URL de download do arquivo.
        Confirme o período com o usuário antes de gerar.
        """)
    public Function<GerarRelatorioParams, Map<String, String>> gerarRelatorioExcel() {
        return params -> {
            String fileName = excelService.gerarRelatorioDespesas(
                params.dataInicio(), params.dataFim()
            );
            return Map.of(
                "downloadUrl", "/api/chat/relatorios/" + fileName,
                "mensagem", "Relatório gerado com sucesso. Disponível para download."
            );
        };
    }
}
```

### 7.3 Habilitar Scheduling

Adicionar `@EnableScheduling` na classe principal:

```java
// Core4erpApplication.java
@SpringBootApplication
@EnableScheduling  // ← adicionar
public class Core4erpApplication { ... }
```

### 7.4 Critério de Aceite da Fase 5

- [ ] "Gera um relatório de março de 2026" → LLM gera XLSX e retorna URL
- [ ] `GET /api/chat/relatorios/{uuid}.xlsx` retorna o arquivo para download
- [ ] Arquivo expirado (>60min) é automaticamente removido
- [ ] Path traversal (`../../../etc/passwd`) é bloqueado

---

## 8. Fase 6 — Frontend com assistant-ui

**Duração estimada: 3–4 dias**

### 8.1 Instalação e Configuração

```bash
cd front-end
npm install @assistant-ui/react @assistant-ui/react-markdown
```

### 8.2 Adapter do Backend (Hook)

**`src/hooks/useChatRuntime.js`**

```javascript
import { useLocalRuntime } from "@assistant-ui/react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

/**
 * Adapter que conecta o assistant-ui ao backend Spring Boot.
 *
 * O LocalRuntime gerencia estado de mensagens internamente.
 * Este adapter apenas define como enviar mensagens ao backend.
 */
const core4ChatAdapter = {
  async *run({ messages, abortSignal }) {
    // Extrair apenas a última mensagem do usuário
    // (o histórico completo é gerenciado pelo backend)
    const lastUserMessage = messages
      .filter((m) => m.role === "user")
      .pop();

    if (!lastUserMessage) return;

    const textContent = lastUserMessage.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");

    try {
      const response = await fetch(`${BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mensagem: textContent }),
        signal: abortSignal,
      });

      if (response.status === 401) {
        localStorage.removeItem("usuario");
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        yield {
          content: [
            {
              type: "text",
              text: error.mensagem || "Erro ao processar mensagem. Tente novamente.",
            },
          ],
        };
        return;
      }

      const data = await response.json();

      const content = [{ type: "text", text: data.resposta }];

      // Se houver URL de download, adicionar como tool call para o ToolUI renderizar
      if (data.downloadUrl) {
        content.push({
          type: "tool-call",
          toolCallId: crypto.randomUUID(),
          toolName: "downloadRelatorio",
          args: { url: data.downloadUrl },
          result: { url: data.downloadUrl },
        });
      }

      yield { content };
    } catch (error) {
      if (error.name === "AbortError") return;
      yield {
        content: [
          {
            type: "text",
            text: "Não foi possível conectar ao servidor. Verifique sua conexão.",
          },
        ],
      };
    }
  },
};

/**
 * Hook que cria e retorna o runtime do assistant-ui
 * configurado para o backend Core 4 ERP.
 */
export function useChatRuntime() {
  return useLocalRuntime(core4ChatAdapter);
}
```

### 8.3 Componente ChatSidebar

**`src/components/chat/ChatSidebar.jsx`**

```jsx
import React, { useState } from "react";
import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
} from "@assistant-ui/react";
import { MarkdownText } from "@assistant-ui/react-markdown";
import { MessageCircle, X, Trash2 } from "lucide-react";
import { useChatRuntime } from "../../hooks/useChatRuntime";
import { DownloadToolUI } from "./RelatorioToolUI";
import { cn } from "../../lib/utils";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

function ChatContent({ onClose }) {
  async function limparHistorico() {
    try {
      await fetch(`${BASE_URL}/api/chat/historico`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch {}
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div>
          <h3 className="text-sm font-bold text-white">C4 Assistant</h3>
          <p className="text-[10px] text-zinc-500">Assistente financeiro</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={limparHistorico}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            title="Limpar conversa"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Thread (mensagens) */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <ThreadPrimitive.Root>
          <ThreadPrimitive.Viewport className="flex flex-col gap-4 p-4">
            <ThreadPrimitive.Messages
              components={{
                UserMessage: () => (
                  <MessagePrimitive.Root className="flex justify-end mb-2">
                    <div className="bg-primary/20 text-white rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%] text-sm">
                      <MessagePrimitive.Content />
                    </div>
                  </MessagePrimitive.Root>
                ),
                AssistantMessage: () => (
                  <MessagePrimitive.Root className="flex justify-start mb-2">
                    <div className="bg-surface-medium text-zinc-200 rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%] text-sm leading-relaxed">
                      <MessagePrimitive.Content
                        components={{ Text: MarkdownText }}
                      />
                    </div>
                  </MessagePrimitive.Root>
                ),
              }}
            />
          </ThreadPrimitive.Viewport>

          {/* Composer (input) */}
          <div className="border-t border-white/5 p-3">
            <ComposerPrimitive.Root className="flex gap-2">
              <ComposerPrimitive.Input
                placeholder="Pergunte sobre suas finanças..."
                className="flex-1 bg-surface border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-zinc-600"
              />
              <ComposerPrimitive.Send className="bg-primary text-on-primary px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-30">
                Enviar
              </ComposerPrimitive.Send>
            </ComposerPrimitive.Root>
          </div>
        </ThreadPrimitive.Root>
      </div>
    </div>
  );
}

/**
 * Drawer lateral do chat com IA.
 * Acessível de qualquer tela via botão flutuante.
 */
export default function ChatSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const runtime = useChatRuntime();

  return (
    <>
      {/* Botão flutuante */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg shadow-primary/20 flex items-center justify-center hover:scale-105 transition-transform"
          title="Abrir assistente"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Painel lateral */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] lg:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={cn(
              "fixed right-0 top-0 bottom-0 z-[70] w-full sm:w-[420px]",
              "bg-surface-low border-l border-white/5 shadow-2xl",
              "transform transition-transform duration-300",
              isOpen ? "translate-x-0" : "translate-x-full"
            )}
          >
            <AssistantRuntimeProvider runtime={runtime}>
              <DownloadToolUI />
              <ChatContent onClose={() => setIsOpen(false)} />
            </AssistantRuntimeProvider>
          </div>
        </>
      )}
    </>
  );
}
```

### 8.4 Tool UI — Download de Relatório

**`src/components/chat/RelatorioToolUI.jsx`**

```jsx
import { makeAssistantToolUI } from "@assistant-ui/react";
import { Download } from "lucide-react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

/**
 * Renderiza um botão de download inline no chat quando
 * o assistente gera um relatório Excel.
 */
export const DownloadToolUI = makeAssistantToolUI({
  toolName: "downloadRelatorio",
  render: ({ args }) => {
    const fullUrl = `${BASE_URL}${args.url}`;

    return (
      <a
        href={fullUrl}
        download
        className="inline-flex items-center gap-2 mt-2 px-4 py-2.5 bg-primary/10 border border-primary/20 text-primary rounded-xl hover:bg-primary/20 transition-colors text-sm font-medium"
      >
        <Download className="w-4 h-4" />
        Baixar Relatório (.xlsx)
      </a>
    );
  },
});
```

### 8.5 Integrar ChatSidebar no App

**Alterar `src/App.jsx`** — adicionar o `ChatSidebar` dentro do `ProtectedLayout`:

```jsx
// Em ProtectedLayout, adicionar antes do </div> final:
import ChatSidebar from './components/chat/ChatSidebar';

function ProtectedLayout({ children }) {
  // ... código existente ...

  return (
    <div className="min-h-screen bg-surface flex relative overflow-x-hidden">
      {/* ... sidebar e content existentes ... */}
      <ChatSidebar />  {/* ← adicionar aqui */}
    </div>
  );
}
```

### 8.6 Adicionar endpoint ao api.js

```javascript
// src/lib/api.js — adicionar ao final
export const chat = {
  enviar: (mensagem) =>
    request('/api/chat', { method: 'POST', body: JSON.stringify({ mensagem }) }),
  limparHistorico: () =>
    request('/api/chat/historico', { method: 'DELETE' }),
};
```

### 8.7 Critério de Aceite da Fase 6

- [ ] Botão flutuante aparece em todas as telas protegidas
- [ ] Clicar abre o drawer lateral com input e área de mensagens
- [ ] Enviar mensagem mostra resposta do assistente com markdown formatado
- [ ] Auto-scroll funciona ao receber novas mensagens
- [ ] Relatório gerado mostra botão de download inline
- [ ] "X" fecha o drawer; botão de lixeira limpa o histórico

---

## 9. Fase 7 — Streaming (SSE)

**Duração estimada: 2–3 dias (após MVP funcional)**

### 9.1 Backend — Endpoint SSE

Adicionar ao `ChatController.java`:

```java
@Operation(summary = "Chat com streaming (Server-Sent Events)")
@PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public Flux<String> enviarMensagemStream(
        @Valid @RequestBody ChatRequestDto request) {
    return chatService.processarStream(request);
}
```

No `ChatService`, adicionar método com `stream()`:

```java
public Flux<String> processarStream(ChatRequestDto request) {
    String systemPrompt = promptBuilder.build(securityCtx.getUsuario());
    List<Message> historico = memoriaConversas
            .computeIfAbsent(securityCtx.getEmail(), k -> new ArrayList<>());
    historico.add(new UserMessage(request.mensagem()));

    return chatClient.prompt()
            .system(systemPrompt)
            .messages(historico)
            .stream()
            .content();  // Flux<String> — cada token como evento SSE
}
```

### 9.2 Frontend — Adapter com Streaming

Atualizar o adapter em `useChatRuntime.js` para consumir SSE:

```javascript
const core4ChatAdapterStreaming = {
  async *run({ messages, abortSignal }) {
    const lastUserMessage = messages.filter((m) => m.role === "user").pop();
    if (!lastUserMessage) return;

    const textContent = lastUserMessage.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");

    const response = await fetch(`${BASE_URL}/api/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ mensagem: textContent }),
      signal: abortSignal,
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
      yield { content: [{ type: "text", text: fullText }] };
    }
  },
};
```

### 9.3 Critério de Aceite da Fase 7

- [ ] Resposta aparece token por token no chat (streaming visual)
- [ ] Cancelar a mensagem (abort) interrompe o stream
- [ ] Fallback para REST se streaming falhar

---

## 10. Fase 8 — Segurança, Observabilidade e Hardening

**Duração estimada: 2–3 dias**

### 10.1 Rate Limiting

Adicionar `/api/chat` e `/api/chat/stream` ao `RateLimitFilter.java` existente com um bucket mais restritivo (ex: 30 req/min):

```java
@Override
protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getServletPath();
    return !path.equals("/api/auth/login")
        && !path.equals("/api/auth/registrar")
        && !path.startsWith("/api/chat");  // ← incluir chat
}
```

### 10.2 Sanitização de Input

Criar um `ChatInputSanitizer` que remove padrões de prompt injection antes de enviar ao LLM:

```java
@Component
public class ChatInputSanitizer {

    private static final List<String> BLOCKED_PATTERNS = List.of(
        "ignore previous instructions",
        "ignore all instructions",
        "you are now",
        "system prompt",
        "reveal your instructions"
    );

    public String sanitize(String input) {
        String lower = input.toLowerCase();
        for (String pattern : BLOCKED_PATTERNS) {
            if (lower.contains(pattern)) {
                return "[mensagem bloqueada por segurança]";
            }
        }
        // Limitar tamanho
        return input.length() > 4000 ? input.substring(0, 4000) : input;
    }
}
```

### 10.3 Auditoria

Registrar log de todas as operações de escrita executadas via chat:

```java
// No LancamentoTools, após cada operação de escrita:
log.info("[CHAT-AUDIT] user={} tool={} params={}",
    securityCtx.getEmail(), "registrarConta", params);
```

### 10.4 Monitoramento de Custos

Registrar tokens consumidos por chamada (Spring AI expõe essa métrica):

```java
ChatResponse response = chatClient.prompt()...call().chatResponse();
Usage usage = response.getMetadata().getUsage();
log.info("[CHAT-USAGE] user={} promptTokens={} completionTokens={} totalTokens={}",
    email, usage.getPromptTokens(),
    usage.getGenerationTokens(), usage.getTotalTokens());
```

### 10.5 Critério de Aceite da Fase 8

- [ ] Rate limit ativo: 31ª requisição em <1 min retorna 429
- [ ] Prompt injection bloqueado: "ignore previous instructions" não funciona
- [ ] Logs de auditoria registram user + tool + params para cada operação de escrita
- [ ] Tokens consumidos por chamada são logados

---

## 11. Fase 9 — Testes

**Duração estimada: 3–4 dias**

### 11.1 Testes Unitários (Backend)

| Classe | O que testar |
|--------|-------------|
| `SystemPromptBuilder` | Prompt contém nome, email e data corretos |
| `ChatInputSanitizer` | Padrões bloqueados são detectados; input normal passa |
| `RelatorioExcelService` | Arquivo gerado é XLSX válido; path traversal é bloqueado |
| Tools (params → dto) | Conversão de records de parâmetros para DTOs dos services |

### 11.2 Testes de Integração (Backend)

| Cenário | Validação |
|---------|-----------|
| `POST /api/chat` sem auth | Retorna 401 |
| `POST /api/chat` com mensagem simples | Retorna 200 com resposta textual |
| `POST /api/chat` com pedido de saldo | LLM invoca `consultarDashboard` |
| `GET /api/chat/relatorios/arquivo-inexistente.xlsx` | Retorna 404 |
| `GET /api/chat/relatorios/../../../etc/passwd` | Retorna 400 |

### 11.3 Testes E2E (Frontend)

| Cenário | Validação |
|---------|-----------|
| Abrir chat | Drawer aparece com input focado |
| Enviar mensagem | Resposta aparece na thread |
| Receber download | Botão de download renderiza e funciona |
| Limpar histórico | Thread fica vazia |

---

## Apêndice A — Catálogo Completo de Tools

### Tools de Consulta (7)

| Tool | Descrição | Parâmetros |
|------|-----------|------------|
| `consultarDashboard` | Resumo financeiro completo | Nenhum |
| `consultarContasCorrentes` | Lista contas correntes | Nenhum |
| `consultarCategorias` | Lista categorias | Nenhum |
| `consultarCartoes` | Lista cartões com limites | Nenhum |
| `consultarInvestimentos` | Lista carteiras | Nenhum |
| `consultarNotificacoes` | Notificações não lidas | Nenhum |

### Tools de Lançamento (5)

| Tool | Descrição | Parâmetros principais |
|------|-----------|----------------------|
| `registrarConta` | Cria conta a pagar/receber | descricao, valor, vencimento, tipo, categoriaId |
| `registrarLancamentoCartao` | Lança em cartão de crédito | cartaoId, descricao, valor, dataCompra, categoriaId |
| `transferirEntreContas` | Transferência entre CCs | origemId, destinoId, valor |
| `baixarConta` | Registra pagamento/recebimento | contaId, contaCorrenteId, dataPagamento |
| `registrarTransacaoInvestimento` | Aporte/resgate/rendimento | contaId, tipo, valor, data |

### Tools de Relatório (1)

| Tool | Descrição | Parâmetros |
|------|-----------|------------|
| `gerarRelatorioExcel` | Gera XLSX para download | dataInicio, dataFim |

---

## Apêndice B — Checklist de Entrega por Fase

| Fase | Duração | Entregáveis |
|------|---------|-------------|
| **1. Ambiente** | 1-2 dias | Dependências, estrutura de pacotes, variáveis de ambiente |
| **2. Domínio do Chat** | 2-3 dias | ChatController, ChatService, SystemPromptBuilder, DTOs |
| **3. Tools de Consulta** | 2-3 dias | 7 tools de leitura funcionais |
| **4. Tools de Lançamento** | 3-4 dias | 5 tools de escrita com confirmação via prompt |
| **5. Relatório Excel** | 2-3 dias | Geração XLSX, download, cleanup automático |
| **6. Frontend assistant-ui** | 3-4 dias | ChatSidebar, adapter, ToolUI, integração no App |
| **7. Streaming SSE** | 2-3 dias | Endpoint SSE, adapter streaming no frontend |
| **8. Segurança** | 2-3 dias | Rate limit, sanitização, auditoria, monitoramento |
| **9. Testes** | 3-4 dias | Unitários, integração, E2E |
| **Total estimado** | **~20-29 dias** | |

---

## Notas Finais

### Ordem de Prioridade

As fases 1-6 compõem o **MVP funcional**. As fases 7-9 são melhorias incrementais que podem ser feitas após o MVP estar em uso.

### Troca de Provider LLM

Para trocar de OpenAI para Anthropic:

1. Substituir no `build.gradle`: `spring-ai-openai-spring-boot-starter` → `spring-ai-anthropic-spring-boot-starter`
2. Em `application.properties`: trocar `spring.ai.openai.*` por `spring.ai.anthropic.*`
3. Alterar a variável de ambiente de `OPENAI_API_KEY` para `ANTHROPIC_API_KEY`
4. Zero alteração no código Java (tools, services, controller permanecem idênticos)

### Evolução Futura

Após o MVP, considerar:

- **RAG (Retrieval-Augmented Generation)**: Indexar documentos fiscais (NFe, boletos) em vector store para consulta por linguagem natural
- **Multi-thread**: Persistir conversas em banco com assistant-ui Cloud ou implementação própria
- **Copilot contextual**: O chat entender em qual tela o usuário está e oferecer ajuda proativa
- **Agente multi-step**: Usar `maxSteps` do Spring AI para permitir que o LLM execute múltiplos tools em sequência (ex: consultar categorias → registrar conta) sem voltar ao frontend entre cada passo
