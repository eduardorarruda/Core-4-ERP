-- R3: Torna o campo tipo nullable para permitir uso exclusivo de tipos customizados
ALTER TABLE tb_conta_investimento ALTER COLUMN tipo DROP NOT NULL;
