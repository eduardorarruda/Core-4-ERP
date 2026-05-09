package br.com.core4erp.observabilidade.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Immutable;

import java.time.OffsetDateTime;

@Entity
@Table(name = "tb_log_performance")
@Immutable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Getter
public class LogPerformance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id", nullable = false, updatable = false, length = 36)
    private String requestId;

    @Column(name = "endpoint", nullable = false, updatable = false, length = 500)
    private String endpoint;

    @Column(name = "http_method", nullable = false, updatable = false, length = 10)
    private String httpMethod;

    @Column(name = "status_code", nullable = false, updatable = false)
    private Integer statusCode;

    @Column(name = "execution_time_ms", nullable = false, updatable = false)
    private Long executionTimeMs;

    @Column(name = "memory_before_bytes", updatable = false)
    private Long memoryBeforeBytes;

    @Column(name = "memory_after_bytes", updatable = false)
    private Long memoryAfterBytes;

    @Column(name = "memory_delta_bytes", updatable = false)
    private Long memoryDeltaBytes;

    @Column(name = "ip_address", nullable = false, updatable = false, length = 45)
    private String ipAddress;

    @Column(name = "user_agent", updatable = false, length = 500)
    private String userAgent;

    @Column(name = "user_id", updatable = false, length = 100)
    private String userId;

    @Column(name = "query_count", updatable = false)
    private Integer queryCount;

    @Column(name = "request_size_bytes", updatable = false)
    private Long requestSizeBytes;

    @Column(name = "response_size_bytes", updatable = false)
    private Long responseSizeBytes;

    @Column(name = "thread_name", updatable = false, length = 100)
    private String threadName;

    @Column(name = "error_message", updatable = false, columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
