-- Garante que registros legados tenham data_saldo_inicial antes de tornar NOT NULL
UPDATE tb_conta_corrente SET data_saldo_inicial = CURRENT_DATE WHERE data_saldo_inicial IS NULL;
ALTER TABLE tb_conta_corrente ALTER COLUMN data_saldo_inicial SET NOT NULL;

-- Flag: permite que a conta fique com saldo negativo (autorizado pelo usuário)
ALTER TABLE tb_conta_corrente ADD COLUMN permitir_saldo_negativo BOOLEAN NOT NULL DEFAULT FALSE;
