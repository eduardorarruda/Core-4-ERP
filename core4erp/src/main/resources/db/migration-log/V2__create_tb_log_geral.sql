DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'log_level') THEN
        CREATE TYPE log_level AS ENUM ('TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS tb_log_geral (
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

CREATE INDEX IF NOT EXISTS idx_log_geral_created_at ON tb_log_geral (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_log_geral_level      ON tb_log_geral (level);
CREATE INDEX IF NOT EXISTS idx_log_geral_request_id ON tb_log_geral (request_id);
CREATE INDEX IF NOT EXISTS idx_log_geral_logger     ON tb_log_geral (logger_name);
CREATE INDEX IF NOT EXISTS idx_log_geral_extra_data ON tb_log_geral USING GIN (extra_data);
