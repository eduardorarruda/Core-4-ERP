-- V49: o token de redefinição de senha passa a ser armazenado só como hash SHA-256 (hex, 64
-- caracteres — cabe na coluna reset_token VARCHAR(64) existente). Tokens pendentes gravados em
-- texto puro deixam de funcionar: são invalidados aqui (o usuário pede um novo link).
-- Idempotente.
UPDATE tb_usuario
   SET reset_token = NULL,
       reset_token_expiry = NULL
 WHERE reset_token IS NOT NULL;
