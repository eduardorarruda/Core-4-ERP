-- Ticket 3: UNIQUE(numero_conta) global bloqueia empresas diferentes com o mesmo número.
-- Substitui pela constraint composta (numero_conta, empresa_id) para garantir isolamento multi-tenant.

DO $$
DECLARE r record;
BEGIN
    FOR r IN (
        SELECT DISTINCT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON kcu.constraint_name = tc.constraint_name
         AND kcu.table_name      = tc.table_name
        WHERE tc.table_name    = 'tb_conta_corrente'
          AND tc.constraint_type = 'UNIQUE'
          AND kcu.column_name    = 'numero_conta'
          AND tc.constraint_name NOT IN (
              SELECT DISTINCT kcu2.constraint_name
              FROM information_schema.key_column_usage kcu2
              WHERE kcu2.table_name  = 'tb_conta_corrente'
                AND kcu2.column_name = 'empresa_id'
          )
    ) LOOP
        EXECUTE 'ALTER TABLE tb_conta_corrente DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_conta_corrente_numero_empresa
    ON tb_conta_corrente(numero_conta, empresa_id)
    WHERE numero_conta IS NOT NULL;
