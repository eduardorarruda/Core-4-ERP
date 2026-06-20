# Core 4 ERP

Sistema de gestão financeira pessoal com autenticação JWT, multi-tenancy por usuário e módulos de contas, cartões, investimentos e dashboard. Inclui observabilidade completa com logging estruturado, métricas de performance por requisição e exposição de métricas Prometheus.

---

## Pré-requisitos

| Ferramenta | Versão mínima |
|------------|--------------|
| Java | 17 |
| Gradle | 8+ |
| Node.js | 20+ |
| PostgreSQL | 15+ |

---

## Variáveis de Ambiente

### Backend (`core4erp/.env` ou variáveis de sistema)

Copie `core4erp/.env.example` e preencha os valores.

#### Banco de dados principal

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DB_URL` | JDBC URL do PostgreSQL (banco principal) | — |
| `DB_USERNAME` | Usuário do banco principal | — |
| `DB_PASSWORD` | Senha do banco principal | — |

#### Banco de dados de log e performance

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DB_URL_LOG_PER` | JDBC URL do banco de observabilidade | Fallback para `DB_URL` |
| `DB_USERNAME_LOG_PER` | Usuário do banco de observabilidade | Fallback para `DB_USERNAME` |
| `DB_PASSWORD_LOG_PER` | Senha do banco de observabilidade | Fallback para `DB_PASSWORD` |

> Se `DB_URL_LOG_PER` não for definido, os logs de performance são gravados no banco principal. Recomenda-se banco separado em produção para não impactar as transações do domínio.

#### Autenticação e segurança

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `SECRET_KEY` | Chave HMAC-SHA256 para JWT (mínimo 64 chars) | — |
| `TOKEN_EXPIRATION` | Expiração do token em ms | `604800000` (7 dias) |
| `CORS_ORIGINS` | Origens permitidas (separadas por vírgula) | `http://localhost:5173` |
| `TRUSTED_PROXY` | Define se o header `X-Forwarded-For` é confiável para rate limiting. Ativar apenas quando a API estiver atrás de um proxy/load balancer conhecido (ex: Render, Railway). Sem isso, o rate limit usa o IP do proxy. | `false` |

#### Outros

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `OPENAI_API_KEY` | Chave da API OpenAI (Chat IA) | — |
| `OPENAI_MODEL` | Modelo OpenAI usado no Chat IA | `gpt-4o-mini` |
| `APP_ENV` | Ambiente atual; aparece nas métricas Prometheus | `development` |
| `HIBERNATE_STATS_ENABLED` | Ativa estatísticas Hibernate (útil em staging para detectar N+1) | `false` |
| `PORT` | Porta HTTP do servidor | `8080` |

### Frontend (`front-end/.env.local`)

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `VITE_API_URL` | URL base do backend | `http://localhost:8080` |

Copie `front-end/.env.example`.

---

## Como executar

### 1. Banco de dados

```bash
# Banco principal (schema criado automaticamente pelo Flyway na inicialização)
createdb core4erp

# Banco de observabilidade — opcional; se não criado, os logs vão para o banco principal
createdb core4erp_log
```

### 2. Backend

```bash
cd core4erp
cp .env.example .env   # preencha as variáveis
./gradlew bootRun
# API disponível em http://localhost:8080
# Swagger UI em http://localhost:8080/swagger-ui.html
```

### 3. Frontend

```bash
cd front-end
cp .env.example .env.local   # ajuste VITE_API_URL se necessário
npm install
npm run dev
# App disponível em http://localhost:5173
```

---

## Arquitetura

```
FrontEnd/
├── core4erp/          # Backend Spring Boot 3.3 + Java 21
│   ├── src/main/java/br/com/core4erp/
│   │   ├── auth/              # Registro, login, JWT (HS256, 7 dias)
│   │   ├── usuario/           # Entidade central de usuário
│   │   ├── categoria/         # Categorias de receita/despesa
│   │   ├── parceiro/          # Fornecedores e clientes
│   │   ├── conta/             # Contas a pagar e a receber
│   │   ├── contaCorrente/     # Contas bancárias com transferências
│   │   ├── cartaoCredito/     # Cartões, lançamentos e faturas
│   │   ├── investimento/      # Carteiras de investimento
│   │   ├── assinatura/        # Assinaturas recorrentes
│   │   ├── conciliacao/       # Conciliação bancária (upload de extratos)
│   │   ├── notificacao/       # Alertas de vencimento
│   │   ├── chat/              # Chat IA (OpenAI gpt-4o-mini + tools)
│   │   ├── relatorio/         # Relatórios Excel e JSON
│   │   ├── dashboard/         # Agregação financeira consolidada
│   │   ├── observabilidade/   # Logging estruturado + métricas de performance
│   │   │   ├── config/        # Datasource secundário e executor async
│   │   │   ├── entity/        # LogGeral, LogPerformance
│   │   │   ├── filter/        # PerformanceMetricsFilter
│   │   │   ├── logging/       # DatabaseLogAppender (Logback)
│   │   │   ├── repository/    # Repositórios JPA do banco de log
│   │   │   └── service/       # LogPersistenceService, LogQueueConsumer
│   │   ├── utils/             # Utilitários (CNPJ, telefone, RequestUtils)
│   │   ├── enums/             # Enumerações do domínio
│   │   ├── exception/         # GlobalExceptionHandler
│   │   └── config/            # Segurança, CORS, JPA primário, EnvConfig
│   └── src/main/resources/
│       ├── db/migration/      # Migrations Flyway — banco principal
│       ├── db/migration-log/  # Migrations Flyway — banco de observabilidade
│       ├── logback-spring.xml # Configuração de logging (console + banco)
│       └── application.properties
└── front-end/         # React 19 + Vite + Tailwind CSS
    └── src/
        ├── views/         # Páginas por módulo
        ├── components/    # Componentes reutilizáveis (layout, ui)
        ├── hooks/         # useAuth, custom hooks
        ├── context/       # AuthContext
        └── lib/api.js     # Fetch com cookie HttpOnly (credentials: include)
```

### Segurança

- Autenticação via JWT (HS256); token armazenado em **HttpOnly cookie** e enviado automaticamente com `credentials: 'include'` — imune a XSS.
- Todas as queries filtram por `usuarioId` — isolamento completo entre usuários.
- Rate limiting por IP em rotas sensíveis (login, registro, chat, upload).
- Headers de segurança configurados: HSTS, X-Frame-Options, Content-Type-Options, Cache-Control.
- `GlobalExceptionHandler` centralizado retorna erros padronizados.

---

## Observabilidade

### Logging estruturado

Toda requisição é rastreada por um `requestId` (gerado ou propagado via header `X-Request-ID`) que aparece em todos os logs e na tabela de performance. O MDC (Mapped Diagnostic Context) propaga automaticamente `requestId`, `userId`, `ipAddress`, `httpMethod` e `endpoint` para cada linha de log.

Os logs são persistidos de forma assíncrona no banco de observabilidade em batches de até 50 eventos a cada 500ms, sem impactar a latência das requisições.

| Tabela | Conteúdo |
|--------|---------|
| `tb_log_geral` | Todos os logs INFO+ da aplicação com contexto de requisição, exceção completa (stack trace) e dados extras em JSONB |
| `tb_log_performance` | Uma linha por requisição HTTP com tempo de execução, delta de memória, status code, tamanho da resposta e usuário |

### Métricas e monitoramento

| Endpoint | Acesso | Descrição |
|----------|--------|-----------|
| `GET /actuator/health` | Público | Health check básico (usado por load balancers) |
| `GET /actuator/metrics` | Apenas ADMIN | Métricas internas do Spring |
| `GET /actuator/prometheus` | Apenas ADMIN | Métricas no formato Prometheus para scraping |
| `GET /actuator/info` | Apenas ADMIN | Informações da aplicação |

Para scraping com Prometheus, configure o job com autenticação de usuário `ADMIN`.

---

## Endpoints principais

| Módulo | Método | Path |
|--------|--------|------|
| Auth | POST | `/api/auth/registrar` |
| Auth | POST | `/api/auth/login` |
| Auth | POST | `/api/auth/logout` |
| Auth | GET | `/api/auth/me` |
| Auth | PUT | `/api/auth/perfil` |
| Categorias | GET/POST/PUT/DELETE | `/api/categorias` |
| Parceiros | GET/POST/PUT/DELETE | `/api/parceiros` |
| Contas financeiras | GET/POST/PUT/DELETE | `/api/contas` |
| Contas financeiras | PATCH | `/api/contas/{id}/baixa` |
| Contas correntes | GET/POST/PUT/DELETE | `/api/contas-correntes` |
| Contas correntes | POST | `/api/contas-correntes/transferir` |
| Cartões | GET/POST/PUT/DELETE | `/api/cartoes` |
| Lançamentos | GET/POST/PUT/DELETE | `/api/cartoes/{id}/lancamentos` |
| Faturas | POST | `/api/cartoes/{id}/fechar-fatura` |
| Investimentos | GET/POST/PUT/DELETE | `/api/investimentos` |
| Transações | GET/POST | `/api/investimentos/{id}/transacoes` |
| Assinaturas | GET/POST/PUT/DELETE | `/api/assinaturas` |
| Conciliação | POST | `/api/conciliacao/upload` |
| Notificações | GET | `/api/notificacoes` |
| Notificações | PATCH | `/api/notificacoes/{id}/lida` |
| Dashboard | GET | `/api/dashboard` |
| Dashboard | GET | `/api/dashboard/saldo-detalhado` |
| Chat IA | POST | `/api/chat` |
| Chat IA | POST | `/api/chat/stream` |
| Chat IA | GET | `/api/chat/relatorios/{fileName}` |
| Chat IA | DELETE | `/api/chat/historico` |
| Relatórios (Excel) | GET | `/api/relatorios/posicao-financeira` |
| Relatórios (Excel) | GET | `/api/relatorios/fluxo-caixa` |
| Relatórios (Excel) | GET | `/api/relatorios/contas-abertas` |
| Relatórios (Excel) | GET | `/api/relatorios/extrato` |
| Relatórios (Excel) | GET | `/api/relatorios/dre` |
| Relatórios (Excel) | GET | `/api/relatorios/investimentos` |
| Relatórios (Excel) | GET | `/api/relatorios/cartoes` |

Cada relatório também expõe `/dados` (ex: `/api/relatorios/dre/dados`) para retorno em JSON.

Documentação interativa completa em `/swagger-ui.html` com o backend rodando.

---

## Decisões de arquitetura notáveis

- **Multi-datasource manual** — a autoconfiguração do Spring Boot (DataSource, JPA, Flyway) foi desativada para permitir dois datasources independentes: `primary` (domínio) e `logper` (observabilidade). Cada um tem seu próprio pool HikariCP, EntityManagerFactory, TransactionManager e conjunto de migrations Flyway.

- **Logging assíncrono com fila** — o `DatabaseLogAppender` (Logback) enfileira eventos em um `LinkedBlockingQueue(1000)` sem bloquear o thread da requisição. O `LogQueueConsumer` drena a fila em batches a cada 500ms usando `saveAll()` em uma única transação, minimizando o número de round-trips ao banco de log.

- **Rastreamento de requisições via MDC** — o `PerformanceMetricsFilter` (filtro mais externo) gera o `requestId` antes de entrar na chain e o coloca no MDC. O `JwtFilter` reutiliza esse ID em vez de gerar um novo, garantindo que `tb_log_performance` e `tb_log_geral` referenciem o mesmo `requestId` — correlação total entre métricas e logs de uma requisição.

- **Flyway versionado** — o schema é evoluído por migrations em `db/migration/` (banco principal) e `db/migration-log/` (banco de observabilidade). O banco é criado automaticamente na inicialização; não é necessário rodar DDL manualmente.

- **Fotos de perfil em Base64** — armazenadas diretamente no banco para simplificar o deploy (sem bucket S3). Não recomendado para volume alto de usuários.

- **Multi-tenancy por coluna** — `usuarioId` em todas as entidades, sem schemas separados. Simples e eficaz para o escopo do projeto.

- **Pool de conexões limitado** — ambos os datasources usam HikariCP com `maximum-pool-size=3` para caber no plano gratuito do Aiven (PostgreSQL). Ajuste via `spring.datasource.hikari.maximum-pool-size` em ambientes com mais conexões disponíveis.
