package br.com.core4erp.observabilidade.filter;

import br.com.core4erp.observabilidade.entity.LogPerformance;
import br.com.core4erp.observabilidade.service.LogPersistenceService;
import br.com.core4erp.utils.RequestUtils;
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

        // Gera o requestId aqui (filtro mais externo) e coloca no MDC para que JwtFilter
        // e todos os logs dentro da requisição usem o mesmo ID, garantindo correlação entre
        // tb_log_performance e tb_log_geral.
        String requestId = RequestUtils.resolveRequestId(request);
        MDC.put("requestId", requestId);

        long startTime = System.currentTimeMillis();
        long memoryBefore = runtime.totalMemory() - runtime.freeMemory();

        try {
            chain.doFilter(request, wrappedResponse);
        } finally {
            long executionTime = System.currentTimeMillis() - startTime;
            long memoryAfter = runtime.totalMemory() - runtime.freeMemory();

            // userId é lido do request attribute porque o JwtFilter (filtro interno)
            // limpa o MDC antes de devolver controle a este filtro.
            LogPerformance entry = LogPerformance.builder()
                    .requestId(requestId)
                    .endpoint(request.getRequestURI())
                    .httpMethod(request.getMethod())
                    .statusCode(wrappedResponse.getStatus())
                    .executionTimeMs(executionTime)
                    .memoryBeforeBytes(memoryBefore)
                    .memoryAfterBytes(memoryAfter)
                    .memoryDeltaBytes(memoryAfter - memoryBefore)
                    .ipAddress(RequestUtils.resolveClientIp(request))
                    .userAgent(request.getHeader("User-Agent"))
                    .userId((String) request.getAttribute("userId"))
                    .requestSizeBytes(request.getContentLengthLong())
                    .responseSizeBytes((long) wrappedResponse.getContentSize())
                    .threadName(Thread.currentThread().getName())
                    .createdAt(OffsetDateTime.now())
                    .build();

            logService.salvarPerformance(entry);
            wrappedResponse.copyBodyToResponse();
            MDC.clear();
        }
    }
}
