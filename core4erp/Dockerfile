FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app
COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon -q
COPY src src
RUN ./gradlew bootJar --no-daemon -x test

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
# OpenTelemetry Java agent — auto-instrumentação de TRACES (Spring MVC, JDBC/JPA,
# HttpClient etc.) sem alterar código. O agente é carregado sempre via -javaagent; o
# que ele faz é controlado pelas envs OTEL_* (ver docker-compose.yml). Sem elas ou com
# OTEL_SDK_DISABLED=true, vira no-op.
# Versão FIXADA + verificação SHA-256 (supply chain): o build falha se o binário baixado
# não bater com o checksum publicado no release do GitHub. Para atualizar: troque a
# versão e o hash (o digest aparece em
# `gh api repos/open-telemetry/opentelemetry-java-instrumentation/releases/tags/vX.Y.Z`
# no campo assets[].digest, ou baixe o .jar e rode `sha256sum`).
ARG OTEL_AGENT_VERSION=2.32.0
ARG OTEL_AGENT_SHA256=f787eb6c7f3d18e69a431e108a15278d25ee37f83d68b678f621e063f3988f82
ADD https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/download/v${OTEL_AGENT_VERSION}/opentelemetry-javaagent.jar /app/opentelemetry-javaagent.jar
RUN echo "${OTEL_AGENT_SHA256}  /app/opentelemetry-javaagent.jar" | sha256sum -c -
COPY --from=builder /app/build/libs/*.jar app.jar
# Artefatos somente-leitura para o usuário da aplicação (root é o dono): um RCE no processo
# Java não consegue sobrescrever o próprio jar/agente.
RUN chmod 0444 app.jar /app/opentelemetry-javaagent.jar
# Runtime sem root.
USER app
# 8080 = API; 8081 = Actuator (management.server.port), só na rede interna do compose.
EXPOSE 8080 8081
ENTRYPOINT ["java", "-javaagent:/app/opentelemetry-javaagent.jar", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-XX:+ExitOnOutOfMemoryError", "-jar", "app.jar"]
