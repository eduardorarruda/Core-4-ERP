INSERT INTO public.flyway_schema_history (installed_rank,"version",description,"type",script,checksum,installed_by,installed_on,execution_time,success) VALUES
	 (1,'1','<< Flyway Baseline >>','BASELINE','<< Flyway Baseline >>',NULL,'avnadmin','2026-05-08 22:38:19.012056',0,true),
	 (2,'4','consolidated schema','SQL','V4__consolidated_schema.sql',18577758,'avnadmin','2026-05-08 22:38:25.91771',9061,true),
	 (3,'5','create tb assinatura','SQL','V5__create_tb_assinatura.sql',-448047285,'avnadmin','2026-05-08 22:38:38.974032',1513,true),
	 (4,'6','create tb conciliacao','SQL','V6__create_tb_conciliacao.sql',1136666801,'avnadmin','2026-05-08 22:38:44.428808',2763,true),
	 (5,'7','add login lockout','SQL','V7__add_login_lockout.sql',-795267336,'avnadmin','2026-05-08 22:38:51.262391',1794,true),
	 (6,'8','add assinatura cartao','SQL','V8__add_assinatura_cartao.sql',1332411636,'avnadmin','2026-05-08 22:38:57.201837',2252,true),
	 (7,'9','business rules','SQL','V9__business_rules.sql',-1125517310,'avnadmin','2026-05-08 22:39:03.653753',2712,true),
	 (8,'10','investimento tipo nullable','SQL','V10__investimento_tipo_nullable.sql',975430033,'avnadmin','2026-05-08 22:39:10.507408',1559,true),
	 (9,'11','conta corrente saldo config','SQL','V11__conta_corrente_saldo_config.sql',-656883027,'avnadmin','2026-05-08 22:39:16.241711',1966,true),
	 (10,'12','add reset token','SQL','V12__add_reset_token.sql',-502733801,'avnadmin','2026-05-12 11:34:02.222947',1770,true);
INSERT INTO public.flyway_schema_history (installed_rank,"version",description,"type",script,checksum,installed_by,installed_on,execution_time,success) VALUES
	 (11,'13','alter telefone to varchar','SQL','V13__alter_telefone_to_varchar.sql',684880689,'avnadmin','2026-05-12 17:43:41.963051',1772,true),
	 (12,'14','create tb transferencia','SQL','V14__create_tb_transferencia.sql',555870119,'avnadmin','2026-05-16 20:06:26.68036',1956,true),
	 (13,'15','fix tb transferencia audit columns','SQL','V15__fix_tb_transferencia_audit_columns.sql',-291901099,'avnadmin','2026-05-16 20:33:30.463927',1911,true),
	 (14,'16','add acct id cartao','SQL','V16__add_acct_id_cartao.sql',-412016243,'avnadmin','2026-05-17 19:23:15.647927',2109,true),
	 (15,'17','create tb conciliacao cartao','SQL','V17__create_tb_conciliacao_cartao.sql',1766542969,'avnadmin','2026-05-17 19:23:22.488109',3435,true);
