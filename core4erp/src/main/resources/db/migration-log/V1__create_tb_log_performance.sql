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

CREATE INDEX idx_log_perf_created_at  ON tb_log_performance (created_at DESC);
CREATE INDEX idx_log_perf_endpoint    ON tb_log_performance (endpoint);
CREATE INDEX idx_log_perf_status_code ON tb_log_performance (status_code);
CREATE INDEX idx_log_perf_user_id     ON tb_log_performance (user_id);
CREATE INDEX idx_log_perf_exec_time   ON tb_log_performance (execution_time_ms DESC);
