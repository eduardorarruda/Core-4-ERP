package br.com.core4erp.observabilidade.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Immutable;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

@Entity
@Table(name = "tb_log_geral")
@Immutable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Getter
public class LogGeral {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id", updatable = false, length = 36)
    private String requestId;

    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "level", nullable = false, updatable = false, columnDefinition = "log_level")
    private LogLevel level;

    @Column(name = "logger_name", nullable = false, updatable = false, length = 500)
    private String loggerName;

    @Column(name = "message", nullable = false, updatable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "exception_class", updatable = false, length = 500)
    private String exceptionClass;

    @Column(name = "exception_message", updatable = false, columnDefinition = "TEXT")
    private String exceptionMessage;

    @Column(name = "stack_trace", updatable = false, columnDefinition = "TEXT")
    private String stackTrace;

    @Column(name = "user_id", updatable = false, length = 100)
    private String userId;

    @Column(name = "ip_address", updatable = false, length = 45)
    private String ipAddress;

    @Column(name = "thread_name", updatable = false, length = 100)
    private String threadName;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "extra_data", updatable = false, columnDefinition = "JSONB")
    private String extraData;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
