package br.com.core4erp.observabilidade.service;

import br.com.core4erp.observabilidade.entity.LogGeral;
import br.com.core4erp.observabilidade.entity.LogLevel;
import br.com.core4erp.observabilidade.logging.DatabaseLogAppender;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.classic.spi.IThrowableProxy;
import ch.qos.logback.classic.spi.StackTraceElementProxy;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class LogQueueConsumer {

    private static final int BATCH_SIZE = 50;
    private static final List<String> MDC_RESERVED = List.of("requestId", "userId", "ipAddress");

    private final LogPersistenceService logService;
    private final ObjectMapper objectMapper;

    @Scheduled(fixedDelay = 500)
    public void drainQueue() {
        List<ILoggingEvent> batch = new ArrayList<>(BATCH_SIZE);
        DatabaseLogAppender.getQueue().drainTo(batch, BATCH_SIZE);

        for (ILoggingEvent event : batch) {
            logService.salvarLog(mapToEntity(event));
        }
    }

    private LogGeral mapToEntity(ILoggingEvent event) {
        Map<String, String> mdc = event.getMDCPropertyMap();
        IThrowableProxy proxy = event.getThrowableProxy();

        return LogGeral.builder()
                .requestId(mdc.get("requestId"))
                .level(LogLevel.valueOf(event.getLevel().toString()))
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
                .filter(e -> !MDC_RESERVED.contains(e.getKey()))
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
        if (extra.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(extra);
        } catch (Exception ex) {
            return null;
        }
    }
}
