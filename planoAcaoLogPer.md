# Plano de Acao: Implementacao de Log e Metricas de Performance

**Projeto:** core4erp  
**Base:** `br.com.core4erp`  
**Banco de dados secundario:** `DB_URL_LOG_PER` / `DB_USERNAME_LOG_PER` / `DB_PASSWORD_LOG_PER`  
**Data:** 2026-05-08

---

## Contexto Tecnico

O sistema ja possui um datasource principal gerenciado pelo Flyway em `db/migration`. O novo banco dedicado a observabilidade exige uma segunda configuracao de datasource, um segundo `EntityManagerFactory`, um segundo `TransactionManager` e um caminho de migration separado. O isolamento total entre os dois bancos e mandatorio: falhas no banco de log nao devem propagar excecoes para o fluxo principal da aplicacao.

A captura de metricas de performance ocorre na camada de filtros HTTP, que e o ponto mais externo da pilha e garante medicao real de ponta a ponta incluindo serialização de resposta. A captura de logs gerais ocorre via um `Appender` customizado do Logback, que e o unico mecanismo capaz de interceptar todos os eventos de log sem modificar nenhuma classe de negocio.

---

## Fase 1 — Infraestrutura de Datasource

### Etapa 1.1 — Configuracao do segundo DataSource

**O QUE:** Criar a classe `LogPerDataSourceConfig` no pacote `br.com.core4erp.config.logper`.

**COMO:** Declarar um `@Bean` do tipo `DataSource` qualificado com `@Qualifier("logPerDataSource")`, lendo as propriedades `spring.datasource.logper.url`, `spring.datasource.logper.username` e `spring.datasource.logper.password` via `@ConfigurationProperties(prefix = "spring.datasource.logper")`. Configurar um pool HikariCP independente com `maximum-pool-size=3` e `minimum-idle=1`, espelhando os limites do pool principal. O bean principal deve ser marcado com `@Primary` para que o Spring continue resolvendo auto-wires sem qualificador para o banco principal.

**POR QUE:** O Spring Boot auto-configura apenas um DataSource. Um segundo datasource declarado sem `@Primary` no bean principal causaria ambiguidade na resolucao de `JpaRepository` existentes. O HikariCP independente impede que picos de carga no banco de log esgotem conexoes do banco principal.

```properties
# Adicionar em application.properties
spring.datasource.logper.url=${DB_URL_LOG_PER}
spring.datasource.logper.username=${DB_USERNAME_LOG_PER}
spring.datasource.logper.password=${DB_PASSWORD_LOG_PER}
spring.datasource.logper.driver-class-name=org.postgresql.Driver
spring.datasource.logper.hikari.maximum-pool-size=3
spring.datasource.logper.hikari.minimum-idle=1
spring.datasource.logper.hikari.connection-timeout=60000
```

---

### Etapa 1.2 — EntityManagerFactory e TransactionManager dedicados

**O QUE:** Criar na mesma classe `LogPerDataSourceConfig` um `LocalContainerEntityManagerFactoryBean` qualificado como `logPerEntityManagerFactory` e um `PlatformTransactionManager` qualificado como `logPerTransactionManager`.

**COMO:**

```java
@Bean("logPerEntityManagerFactory")
public LocalContainerEntityManagerFactoryBean logPerEntityManagerFactory(
        @Qualifier("logPerDataSource") DataSource dataSource,
        JpaVendorAdapter adapter) {

    LocalContainerEntityManagerFactoryBean factory = new LocalContainerEntityManagerFactoryBean();
    factory.setDataSource(dataSource);
    factory.setJpaVendorAdapter(adapter);
    factory.setPackagesToScan("br.com.core4erp.observabilidade.entity");

    Properties props = new Properties();
    props.setProperty("hibernate.hbm2ddl.auto", "validate");
    props.setProperty("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
    factory.setJpaProperties(props);
    return factory;
}

@Bean("logPerTransactionManager")
public PlatformTransactionManager logPerTransactionManager(
        @Qualifier("logPerEntityManagerFactory") EntityManagerFactory emf) {
    return new JpaTransactionManager(emf);
}
```

O `packagesToScan` deve apontar exclusivamente para o pacote de entidades do modulo de observabilidade, garantindo que o JPA do banco secundario nunca tente gerenciar entidades do banco principal.

**POR QUE:** Sem um `EntityManagerFactory` separado o Hibernate tentaria criar as tabelas de log no banco principal ou vice-versa. Sem um `TransactionManager` separado, metodos `@Transactional` nas classes de escrita de log poderiam participar de transacoes do banco de negocio, criando acoplamento e risco de rollback cruzado.

---

### Etapa 1.3 — Instancia dedicada do Flyway para o banco de log

**O QUE:** Criar um bean `Flyway` qualificado como `logPerFlyway` dentro de `LogPerDataSourceConfig`, desabilitando a auto-configuracao padrao do Flyway para este datasource.

**COMO:**

```java
@Bean("logPerFlyway")
@DependsOn("logPerDataSource")
public Flyway logPerFlyway(@Qualifier("logPerDataSource") DataSource dataSource) {
    Flyway flyway = Flyway.configure()
            .dataSource(dataSource)
            .locations("classpath:db/migration-log")
            .baselineOnMigrate(true)
            .baselineVersion("1")
            .outOfOrder(true)
            .load();
    flyway.migrate();
    return flyway;
}
```

Adicionar em `application.properties`:

```properties
spring.flyway.enabled=true
# A instancia padrao continua gerenciando db/migration (banco principal)
# A instancia logPerFlyway gerencia db/migration-log (banco de log)
```

**POR QUE:** O Flyway auto-configurado pelo Spring Boot leria apenas `db/migration` e aplicaria as migrations no datasource primario. Uma instancia programatica separada com `locations("classpath:db/migration-log")` garante que o versionamento do banco de log seja independente, evitando conflitos de numero de versao e permitindo que os dois bancos evoluam em ritmos diferentes.

---

## Fase 2 — Estrutura do Banco de Dados (Migrations)

### Etapa 2.1 — Migration V1: Tabela de Performance de Requisicoes

**O QUE:** Criar o arquivo `core4erp/src/main/resources/db/migration-log/V1__create_tb_log_performance.sql`.

**COMO:**

```sql
CREATE TABLE tb_log_performance (
    id                   BIGSERIAL        PRIMARY KEY,
    request_id           VARCHAR(36)      NOT NULL,
    endpoint             VARCHAR(500)     NOT NULL,
    http_method          VARCHAR(10)      NOT NULL,
    status_code          SMALLINT         NOT NULL,
    execution_time_ms    BIGINT           NOT NULL,
    memory_before_bytes  BIGINT,
    memory_after_bytes   BIGINT,
    memory_delta_bytes   BIGINT,
    ip_address           VARCHAR(45)      NOT NULL,
    user_agent           VARCHAR(500),
    user_id              VARCHAR(100),
    query_count          INTEGER,
    request_size_bytes   BIGINT,
    response_size_bytes  BIGINT,
    thread_name          VARCHAR(100),
    error_message        TEXT,
    created_at           TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE INDEX idx_log_perf_created_at   ON tb_log_performance (created_at DESC);
CREATE INDEX idx_log_perf_endpoint     ON tb_log_performance (endpoint);
CREATE INDEX idx_log_perf_status_code  ON tb_log_performance (status_code);
CREATE INDEX idx_log_perf_user_id      ON tb_log_performance (user_id);
CREATE INDEX idx_log_perf_exec_time    ON tb_log_performance (execution_time_ms DESC);
```

**Justificativa de campos:**

| Campo | Justificativa |
|---|---|
| `request_id` | Correlaciona a linha de performance com todas as entradas de log geradas pela mesma requisicao via MDC |
| `execution_time_ms` | Metrica primaria para identificar endpoints lentos e SLA |
| `memory_before/after/delta` | Permite detectar operacoes com alto consumo de heap sem profiler externo |
| `status_code` | Segmenta analises por erros (4xx/5xx) vs sucesso (2xx) sem joins |
| `ip_address` (VARCHAR 45) | Suporta IPv4 e IPv6 completo |
| `query_count` | Expoe problemas de N+1 por endpoint direto no banco de log |
| `user_id` | Permite analise de performance por usuario/tenant |

**POR QUE:** Indexes em `created_at`, `endpoint`, `status_code` e `execution_time_ms` sao essenciais para consultas analiticas tipicas (top endpoints lentos nos ultimos 7 dias, taxa de erro por endpoint, percentis de latencia). Sem esses indexes, qualquer query analitica sobre volume de dados realizara full scan.

---

### Etapa 2.2 — Migration V2: Tabela de Logs Gerais

**O QUE:** Criar o arquivo `core4erp/src/main/resources/db/migration-log/V2__create_tb_log_geral.sql`.

**COMO:**

```sql
CREATE TYPE log_level AS ENUM ('TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR');

CREATE TABLE tb_log_geral (
    id                BIGSERIAL    PRIMARY KEY,
    request_id        VARCHAR(36),
    level             log_level    NOT NULL,
    logger_name       VARCHAR(500) NOT NULL,
    message           TEXT         NOT NULL,
    exception_class   VARCHAR(500),
    exception_message TEXT,
    stack_trace       TEXT,
    user_id           VARCHAR(100),
    ip_address        VARCHAR(45),
    thread_name       VARCHAR(100),
    extra_data        JSONB,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_log_geral_created_at  ON tb_log_geral (created_at DESC);
CREATE INDEX idx_log_geral_level       ON tb_log_geral (level);
CREATE INDEX idx_log_geral_request_id  ON tb_log_geral (request_id);
CREATE INDEX idx_log_geral_logger      ON tb_log_geral (logger_name);
CREATE INDEX idx_log_geral_extra_data  ON tb_log_geral USING GIN (extra_data);
```

**Justificativa de campos:**

| Campo | Justificativa |
|---|---|
| `level` como ENUM | Permite filtros indexados eficientes e impede insercao de valores invalidos |
| `extra_data JSONB` | Armazena campos estruturados adicionais do MDC sem alterar o schema (chaves como `orderId`, `userId`, etc.) |
| `stack_trace TEXT` | Preserva stack trace completo para diagnostico sem truncamento |
| `request_id` | Permite reconstruir toda a sequencia de logs de uma requisicao com erro |
| Index GIN em `extra_data` | Habilita queries eficientes sobre campos dinamicos do MDC |

**POR QUE:** Separar a tabela de logs da tabela de performance permite politicas de retencao e arquivamento distintas. Logs gerais podem ser purgados apos 90 dias enquanto metricas de performance podem ser retidas por 1 ano para analise de tendencia. A coluna `extra_data JSONB` evita o problema de schema explosion que ocorre quando cada novo campo logado via `kv()` exige uma nova coluna.

---

## Fase 3 — Camada de Dominio (Modulo Observabilidade)

### Etapa 3.1 — Entidades JPA

**O QUE:** Criar `LogPerformance.java` e `LogGeral.java` em `br.com.core4erp.observabilidade.entity`.

**COMO:** Ambas as entidades devem ser imutaveis (sem setters, construtor `@AllArgsConstructor`, campos `final`), pois registros de log nunca sao atualizados. Nao devem implementar `equals`/`hashCode` baseados em ID gerado (usar `@NaturalId` seria inadequado para logs). Usar `@Column(insertable = true, updatable = false)` em todos os campos para garantir que nenhum UPDATE seja emitido acidentalmente.

```java
@Entity
@Table(name = "tb_log_performance")
@Immutable  // Hibernate: marca como somente leitura, desabilita dirty checking
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class LogPerformance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id", nullable = false, updatable = false)
    private String requestId;

    @Column(name = "endpoint", nullable = false, updatable = false, length = 500)
    private String endpoint;

    // demais campos...

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
```

A anotacao `@Immutable` do Hibernate elimina o dirty-checking no flush, reduzindo overhead de CPU em escritas de alta frequencia.

**POR QUE:** Entidades de log sao append-only por natureza. Declarar `@Immutable` e `updatable = false` em todos os campos impede que um bug de negocio acidentalmente atualize um registro historico, preservando a integridade da trilha de auditoria.

---

### Etapa 3.2 — Repositorios dedicados

**O QUE:** Criar `LogPerformanceRepository` e `LogGeralRepository` em `br.com.core4erp.observabilidade.repository`.

**COMO:** Estender `JpaRepository` e anotar com `@Repository`. O `EntityManager` injetado deve ser o do banco secundario. Para garantir isso, usar `@PersistenceContext(unitName = "logPerEntityManagerFactory")` na configuracao base ou declarar os repositorios dentro de um `@EnableJpaRepositories` com `entityManagerFactoryRef` e `transactionManagerRef` apontando para os beans do banco de log.

```java
@Configuration
@EnableJpaRepositories(
    basePackages = "br.com.core4erp.observabilidade.repository",
    entityManagerFactoryRef = "logPerEntityManagerFactory",
    transactionManagerRef = "logPerTransactionManager"
)
public class LogPerJpaConfig {}
```

O `@EnableJpaRepositories` principal (auto-configurado) deve ser restringido ao pacote de repositorios de negocio para evitar que o Spring tente registrar os repositorios de log com o `EntityManagerFactory` errado.

**POR QUE:** Sem a segregacao de `@EnableJpaRepositories` por pacote, o Spring associa todos os repositorios ao `EntityManagerFactory` primario. Isso causaria `org.hibernate.HibernateException: Table 'tb_log_performance' doesn't exist` no banco principal ou, pior, criaria as tabelas no banco errado caso `ddl-auto` nao fosse `validate`.

---

### Etapa 3.3 — Servico de Escrita Assincrona

**O QUE:** Criar `LogPersistenceService` em `br.com.core4erp.observabilidade.service`.

**COMO:** Anotar cada metodo publico de gravacao com `@Async("logExecutor")` e `@Transactional("logPerTransactionManager")`. O metodo deve capturar qualquer excecao internamente e logar apenas para o console (nao para o banco, evitando recursao), garantindo que falhas na gravacao de log nunca propaguem para a requisicao original.

```java
@Service
@RequiredArgsConstructor
public class LogPersistenceService {

    private final LogPerformanceRepository performanceRepo;
    private final LogGeralRepository logGeralRepo;

    @Async("logExecutor")
    @Transactional("logPerTransactionManager")
    public void salvarPerformance(LogPerformance entry) {
        try {
            performanceRepo.save(entry);
        } catch (Exception ex) {
            // Log apenas para stdout/stderr — nunca para o banco de log (evita loop infinito)
            System.err.println("[LogPersistenceService] Falha ao salvar metrica de performance: " + ex.getMessage());
        }
    }

    @Async("logExecutor")
    @Transactional("logPerTransactionManager")
    public void salvarLog(LogGeral entry) {
        try {
            logGeralRepo.save(entry);
        } catch (Exception ex) {
            System.err.println("[LogPersistenceService] Falha ao salvar log geral: " + ex.getMessage());
        }
    }
}
```

Configurar o executor dedicado:

```java
@Bean("logExecutor")
public Executor logExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(2);
    executor.setMaxPoolSize(4);
    executor.setQueueCapacity(500);
    executor.setThreadNamePrefix("log-async-");
    executor.setRejectedExecutionHandler(new ThreadPoolExecutor.DiscardPolicy());
    executor.initialize();
    return executor;
}
```

`DiscardPolicy` descarta silenciosamente quando a fila esta cheia (prefivel a `AbortPolicy` que lancaria excecao em producao sobrecarregada).

**POR QUE:** Escrever no banco de log de forma sincrona adicionaria a latencia de toda requisicao HTTP o custo de um INSERT no banco secundario (tipicamente 5-20ms). Em um sistema de alta concorrencia, isso dobraria o tempo de resposta percebido. A escrita assincrona desacopla o caminho critico da requisicao da persistencia de observabilidade.

---

## Fase 4 — Interceptacao de Metricas de Performance

### Etapa 4.1 — ContentCachingResponseWrapper para captura de status e tamanho

**O QUE:** Implementar `PerformanceMetricsFilter` como `OncePerRequestFilter` em `br.com.core4erp.observabilidade.filter`.

**COMO:** Este filtro deve ser posicionado como o primeiro da cadeia (prioridade mais alta, antes do `JwtFilter`) para que o tempo medido inclua autenticacao, autorizacao e serializacao de resposta. Usar `ContentCachingResponseWrapper` do Spring para capturar o status code e o tamanho do corpo da resposta.

```java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
public class PerformanceMetricsFilter extends OncePerRequestFilter {

    private final LogPersistenceService logService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        ContentCachingResponseWrapper wrappedResponse = new ContentCachingResponseWrapper(response);
        Runtime runtime = Runtime.getRuntime();

        long startTime        = System.currentTimeMillis();
        long memoryBefore     = runtime.totalMemory() - runtime.freeMemory();
        String requestId      = getOrCreateRequestId(request);

        try {
            chain.doFilter(request, wrappedResponse);
        } finally {
            long executionTime  = System.currentTimeMillis() - startTime;
            long memoryAfter    = runtime.totalMemory() - runtime.freeMemory();
            long memoryDelta    = memoryAfter - memoryBefore;

            LogPerformance entry = LogPerformance.builder()
                .requestId(requestId)
                .endpoint(request.getRequestURI())
                .httpMethod(request.getMethod())
                .statusCode(wrappedResponse.getStatus())
                .executionTimeMs(executionTime)
                .memoryBeforeBytes(memoryBefore)
                .memoryAfterBytes(memoryAfter)
                .memoryDeltaBytes(memoryDelta)
                .ipAddress(resolveClientIp(request))
                .userAgent(request.getHeader("User-Agent"))
                .userId(MDC.get("userId"))
                .requestSizeBytes(request.getContentLengthLong())
                .responseSizeBytes((long) wrappedResponse.getContentSize())
                .threadName(Thread.currentThread().getName())
                .createdAt(OffsetDateTime.now())
                .build();

            logService.salvarPerformance(entry);
            wrappedResponse.copyBodyToResponse();
        }
    }

    private String getOrCreateRequestId(HttpServletRequest request) {
        String id = request.getHeader("X-Request-ID");
        return (id != null && !id.isBlank()) ? id : UUID.randomUUID().toString().substring(0, 8);
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
```

A chamada `wrappedResponse.copyBodyToResponse()` no bloco `finally` e obrigatoria para que o corpo da resposta seja efetivamente enviado ao cliente apos o wrap.

**POR QUE:** O `OncePerRequestFilter` garante execucao exatamente uma vez por requisicao mesmo em forwards e includes internos do Servlet. A posicao `HIGHEST_PRECEDENCE` garante que o `startTime` seja capturado antes de qualquer logica de autenticacao, tornando `execution_time_ms` uma medida de tempo real de resposta do sistema, nao apenas do tempo de negocio.

---

### Etapa 4.2 — Captura de contagem de queries (Hibernate Statistics)

**O QUE:** Habilitar `hibernate.generate_statistics=true` apenas para o datasource principal e expor o contador de queries via `StatisticsService`.

**COMO:** Registrar um `ThreadLocal<Long>` que e zerado no inicio da requisicao (no `PerformanceMetricsFilter`) e consultado no `finally`. Usar `SessionFactory.getStatistics().getQueryExecutionCount()` como ponto de leitura.

```properties
# Adicionar em application.properties (apenas para ambiente dev/staging)
spring.jpa.properties.hibernate.generate_statistics=${HIBERNATE_STATS_ENABLED:false}
```

Em producao, manter `false` para evitar overhead. Em staging, habilitar via variavel de ambiente para deteccao de N+1 por endpoint.

**POR QUE:** A coluna `query_count` na tabela de performance e o unico mecanismo que permite identificar, sem analise de logs SQL, quais endpoints estao produzindo N+1 queries. Um endpoint que executa 50+ queries e candidato imediato a revisao de `@EntityGraph` ou `JOIN FETCH`.

---

## Fase 5 — Captura de Logs Gerais via Appender Customizado

### Etapa 5.1 — Appender Logback com fila em memoria

**O QUE:** Criar `DatabaseLogAppender` em `br.com.core4erp.observabilidade.logging`, estendendo `AppenderBase<ILoggingEvent>`.

**COMO:** O appender nao pode depender do `ApplicationContext` do Spring diretamente, pois o Logback e inicializado antes do Spring. A estrategia segura e publicar eventos em uma `LinkedBlockingQueue` estatica que e drenada por um consumer Spring apos o contexto estar pronto.

```java
public class DatabaseLogAppender extends AppenderBase<ILoggingEvent> {

    private static final LinkedBlockingQueue<ILoggingEvent> QUEUE =
            new LinkedBlockingQueue<>(1000);

    public static LinkedBlockingQueue<ILoggingEvent> getQueue() {
        return QUEUE;
    }

    @Override
    protected void append(ILoggingEvent event) {
        // Evitar loop: nao capturar logs dos proprios pacotes de observabilidade
        if (event.getLoggerName().startsWith("br.com.core4erp.observabilidade")) {
            return;
        }
        QUEUE.offer(event); // offer descarta silenciosamente se a fila estiver cheia
    }
}
```

Registrar o appender em `logback-spring.xml`:

```xml
<appender name="DATABASE" class="br.com.core4erp.observabilidade.logging.DatabaseLogAppender"/>

<root level="INFO">
    <appender-ref ref="CONSOLE"/>
    <appender-ref ref="DATABASE"/>
</root>
```

**POR QUE:** O Logback e inicializado antes do `ApplicationContext` do Spring. Injetar um `DataSource` ou `JdbcTemplate` diretamente no appender causaria `NullPointerException` ou `BeanCurrentlyInCreationException` durante o startup. A fila em memoria como buffer desacopla a captura (responsabilidade do Logback) da persistencia (responsabilidade do Spring), eliminando qualquer dependencia circular.

---

### Etapa 5.2 — Consumer Spring da fila de logs

**O QUE:** Criar `LogQueueConsumer` em `br.com.core4erp.observabilidade.service`, anotado com `@Component`.

**COMO:** Usar `@Scheduled(fixedDelay = 500)` para drenar a fila em lotes a cada 500ms, convertendo `ILoggingEvent` em entidades `LogGeral` e gravando via `LogPersistenceService`.

```java
@Component
@RequiredArgsConstructor
public class LogQueueConsumer {

    private static final int BATCH_SIZE = 50;
    private final LogPersistenceService logService;

    @Scheduled(fixedDelay = 500)
    public void drainQueue() {
        List<ILoggingEvent> batch = new ArrayList<>(BATCH_SIZE);
        DatabaseLogAppender.getQueue().drainTo(batch, BATCH_SIZE);

        for (ILoggingEvent event : batch) {
            LogGeral entry = mapToEntity(event);
            logService.salvarLog(entry);
        }
    }

    private LogGeral mapToEntity(ILoggingEvent event) {
        Map<String, String> mdc = event.getMDCPropertyMap();
        IThrowableProxy proxy   = event.getThrowableProxy();

        return LogGeral.builder()
            .requestId(mdc.get("requestId"))
            .level(event.getLevel().toString())
            .loggerName(event.getLoggerName())
            .message(event.getFormattedMessage())
            .exceptionClass(proxy != null ? proxy.getClassName() : null)
            .exceptionMessage(proxy != null ? proxy.getMessage() : null)
            .stackTrace(proxy != null ? formatStackTrace(proxy) : null)
            .userId(mdc.get("userId"))
            .ipAddress(mdc.get("ipAddress"))
            .threadName(event.getThreadName())
            .extraData(buildExtraData(mdc))
            .createdAt(OffsetDateTime.ofInstant(
                Instant.ofEpochMilli(event.getTimeStamp()), ZoneOffset.UTC))
            .build();
    }

    private String formatStackTrace(IThrowableProxy proxy) {
        StringBuilder sb = new StringBuilder(proxy.getClassName())
            .append(": ").append(proxy.getMessage()).append("\n");
        for (StackTraceElementProxy ste : proxy.getStackTraceElementProxyArray()) {
            sb.append("\tat ").append(ste.getSTEAsString()).append("\n");
        }
        return sb.toString();
    }

    private String buildExtraData(Map<String, String> mdc) {
        Map<String, String> extra = mdc.entrySet().stream()
            .filter(e -> !List.of("requestId", "userId", "ipAddress").contains(e.getKey()))
            .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
        return extra.isEmpty() ? null : new ObjectMapper().valueToTree(extra).toString();
    }
}
```

Habilitar o scheduling em `Core4erpApplication` ou em uma classe de configuracao:

```java
@EnableScheduling
@EnableAsync
@SpringBootApplication
public class Core4erpApplication { ... }
```

**POR QUE:** O batch de 50 registros por ciclo de 500ms balanceia latencia de gravacao (logs aparecem no banco em ate 500ms) com eficiencia de conexao (reduz numero de transacoes abertas). O `drainTo(batch, BATCH_SIZE)` e thread-safe e nao bloqueia se a fila estiver vazia.

---

## Fase 6 — Enriquecimento do MDC

### Etapa 6.1 — Expansao do RequestContextFilter existente

**O QUE:** O projeto ja possui o `JwtFilter`. Expandir (ou criar um filtro complementar de ordem mais alta) para inserir no MDC todos os campos necessarios para que o appender de log e o filtro de performance leiam dados consistentes.

**COMO:** Garantir que o MDC contenha, no minimo, os seguintes campos antes da execucao da cadeia de filtros:

```java
MDC.put("requestId",  requestId);
MDC.put("userId",     resolveUserId(request));   // extraido do JWT se disponivel
MDC.put("ipAddress",  resolveClientIp(request));
MDC.put("httpMethod", request.getMethod());
MDC.put("endpoint",   request.getRequestURI());
```

O `MDC.clear()` deve ocorrer no bloco `finally` deste filtro, garantindo que nenhum contexto de uma requisicao anterior vaze para a proxima em pools de threads.

**POR QUE:** O `ILoggingEvent.getMDCPropertyMap()` capturado pelo appender contem exatamente o que estava no MDC no momento em que o log foi emitido. Se o `userId` nao estiver no MDC antes do log ser gerado, a coluna `user_id` ficara nula em todas as linhas — perdendo a rastreabilidade por usuario. O MDC e a unica forma de propagar contexto de requisicao para camadas que nao recebem `HttpServletRequest` como parametro (services, repositories).

---

### Etapa 6.2 — Propagacao de MDC em threads assincronas

**O QUE:** Configurar o `logExecutor` (definido na Etapa 3.3) para propagar o `MDCContext` automaticamente.

**COMO:** Substituir `ThreadPoolTaskExecutor` por um wrapper que copia o mapa MDC antes de submeter a tarefa:

```java
@Bean("logExecutor")
public Executor logExecutor() {
    ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
    executor.setCorePoolSize(2);
    executor.setMaxPoolSize(4);
    executor.setQueueCapacity(500);
    executor.setThreadNamePrefix("log-async-");
    executor.setTaskDecorator(runnable -> {
        Map<String, String> mdcCopy = MDC.getCopyOfContextMap();
        return () -> {
            try {
                if (mdcCopy != null) MDC.setContextMap(mdcCopy);
                runnable.run();
            } finally {
                MDC.clear();
            }
        };
    });
    executor.setRejectedExecutionHandler(new ThreadPoolExecutor.DiscardPolicy());
    executor.initialize();
    return executor;
}
```

**POR QUE:** O MDC e armazenado em `ThreadLocal`. Threads do pool criado pelo `@Async` nao herdam o `ThreadLocal` da thread da requisicao HTTP. Sem a copia explicita do mapa MDC, todos os logs emitidos dentro dos metodos `@Async` do `LogPersistenceService` teriam `requestId` e `userId` nulos, tornando inutil a correlacao de logs.

---

## Fase 7 — Resumo Estrutural de Artefatos

### Novos arquivos a criar

```
core4erp/src/main/java/br/com/core4erp/
└── observabilidade/
    ├── config/
    │   └── LogPerDataSourceConfig.java      # Datasource, EMF, TxManager, Flyway
    ├── entity/
    │   ├── LogPerformance.java
    │   └── LogGeral.java
    ├── filter/
    │   └── PerformanceMetricsFilter.java
    ├── logging/
    │   └── DatabaseLogAppender.java
    ├── repository/
    │   ├── LogPerformanceRepository.java
    │   └── LogGeralRepository.java
    └── service/
        ├── LogPersistenceService.java
        └── LogQueueConsumer.java

core4erp/src/main/resources/
└── db/
    └── migration-log/
        ├── V1__create_tb_log_performance.sql
        └── V2__create_tb_log_geral.sql

core4erp/src/main/resources/
└── logback-spring.xml                       # Adicionar appender DATABASE
```

### Modificacoes em arquivos existentes

| Arquivo | Modificacao |
|---|---|
| `application.properties` | Adicionar `spring.datasource.logper.*` e configuracoes do executor |
| `Core4erpApplication.java` | Adicionar `@EnableScheduling` e `@EnableAsync` |
| `JwtFilter.java` ou filtro MDC | Expandir campos inseridos no MDC (`ipAddress`, `userId`, `endpoint`) |

---

## Fase 8 — Consideracoes de Seguranca e Conformidade

**Dados sensiveis:** A coluna `user_agent` pode conter fingerprints de dispositivo. A coluna `ip_address` e considerada dado pessoal pela LGPD. O plano de retencao deve prever purga automatica apos o periodo definido pela politica de privacidade do sistema.

**Filtragem de logs sensiveis:** O `DatabaseLogAppender` nao deve capturar logs de nivel `DEBUG` ou `TRACE` em producao. Configurar no `logback-spring.xml` um `ThresholdFilter` com `level = INFO` no appender `DATABASE`.

**Exclusao de endpoints de healthcheck:** O `PerformanceMetricsFilter` deve ignorar requisicoes para `/actuator/**` para evitar que o Prometheus scrap gere milhares de linhas de performance sem valor analitico:

```java
@Override
protected boolean shouldNotFilter(HttpServletRequest request) {
    return request.getRequestURI().startsWith("/actuator");
}
```

---

## Ordem de Implementacao Recomendada

1. Fase 1 completa (DataSource, EMF, TxManager, Flyway secundario)
2. Fase 2 completa (migrations — estrutura de tabelas)
3. Etapas 3.1 e 3.2 (entidades e repositorios)
4. Etapa 3.3 (servico assincrono de persistencia)
5. Etapa 4.1 (filtro de performance)
6. Etapas 5.1 e 5.2 (appender e consumer de logs)
7. Fase 6 (MDC enrichment e propagacao async)
8. Fase 8 (revisao de seguranca e exclusoes)

A sequencia respeita dependencias: as tabelas precisam existir antes das entidades JPA serem validadas pelo Hibernate (`ddl-auto=validate`); o servico de persistencia precisa existir antes dos filtros que o injetam; o appender e o consumer de fila precisam estar prontos antes de habilitar `@EnableScheduling`.
