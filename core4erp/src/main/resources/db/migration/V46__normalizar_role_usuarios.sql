-- V46: corrige escalada de privilégio do auto-cadastro.
-- Até aqui o registro de contas EMPRESA atribuía role = 'ROLE_ADMIN' ao próprio usuário. O papel
-- global não concede nada por si só (o RBAC é por empresa, via tb_usuario_empresa/perfil), mas
-- qualquer regra hasRole('ADMIN') futura viraria brecha. Todo usuário que não é Admin do Sistema
-- passa a ter ROLE_USER. Idempotente: reexecutar não altera nada.
UPDATE tb_usuario
   SET role = 'ROLE_USER'
 WHERE admin_sistema = FALSE
   AND role IS DISTINCT FROM 'ROLE_USER';
