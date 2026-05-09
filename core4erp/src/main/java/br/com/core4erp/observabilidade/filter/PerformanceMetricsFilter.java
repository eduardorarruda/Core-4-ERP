package br.com.core4erp.observabilidade.filter;

import br.com.core4erp.observabilidade.entity.LogPerformance;
import br.com.core4erp.observabilidade.service.LogPersistenceService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.UUID;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
@RequiredArgsConstructor
public class PerformanceMetricsFilter extends OncePerRequestFilter {

    private final LogPersistenceService logService;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return request.getRequestURI().startsWith("/actuator");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        ContentCachingResponseWrapper wrappedResponse = new ContentCachingResponseWrapper(response);
        Runtime runtime = Runtime.getRuntime();

        long startTime = System.currentTimeMillis();
        long memoryBefore = runtime.totalMemory() - runtime.freeMemory();
        String requestId = getOrCreateRequestId(request);

        try {
            chain.doFilter(request, wrappedResponse);
        } finally {
            long executionTime = System.currentTimeMillis() - startTime;
            long memoryAfter = runtime.totalMemory() - runtime.freeMemory();

            LogPerformance entry = LogPerformance.builder()
                    .requestId(requestId)
                    .endpoint(request.getRequestURI())
                    .httpMethod(request.getMethod())
                    .statusCode(wrappedResponse.getStatus())
                    .executionTimeMs(executionTime)
                    .memoryBeforeBytes(memoryBefore)
                    .memoryAfterBytes(memoryAfter)
                    .memoryDeltaBytes(memoryAfter - memoryBefore)
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
