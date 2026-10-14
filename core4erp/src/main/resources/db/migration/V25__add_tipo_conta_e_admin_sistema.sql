DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_conta_enum') THEN
        CREATE TYPE tipo_conta_enum AS ENUM ('EMPRESA', 'PESSOA_FISICA');
    END IF;
END $$;

ALTER TABLE tb_usuario
    ADD COLUMN IF NOT EXISTS tipo_conta      tipo_conta_enum NOT NULL DEFAULT 'EMPRESA',
    ADD COLUMN IF NOT EXISTS admin_sistema   BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS senha_provisoria BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_usuario_admin_sistema ON tb_usuario(admin_sistema) WHERE admin_sistema = TRUE;
