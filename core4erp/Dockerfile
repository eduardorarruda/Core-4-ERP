FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /app
COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .
RUN chmod +x gradlew && ./gradlew dependencies --no-daemon -q
COPY src src
RUN ./gradlew bootJar --no-daemon -x test

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
# OpenTelemetry Java agent — auto-instrumentação de TRACES (Spring MVC, JDBC/JPA,
# HttpClient etc.) sem alterar código. O agente é carregado sempre via -javaagent; o
# que ele faz é controlado pelas envs OTEL_* (ver docker-compose.yml). Sem elas ou com
# OTEL_SDK_DISABLED=true, vira no-op. Para build reprodutível, fixe uma versão no lugar
# de 'latest/download'.
ADD https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar /app/opentelemetry-javaagent.jar
COPY --from=builder /app/build/libs/*.jar app.jar
RUN chown app:app app.jar /app/opentelemetry-javaagent.jar
USER app
EXPOSE 8080
ENTRYPOINT ["java", "-javaagent:/app/opentelemetry-javaagent.jar", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-XX:+ExitOnOutOfMemoryError", "-jar", "app.jar"]
