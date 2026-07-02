package br.com.core4erp.empresa.entity;

public enum AcaoAuditoria {
    CRIAR, EDITAR, DELETAR,
    // Operações financeiras auditadas (tela e IA)
    BAIXAR, ESTORNAR, TRANSFERIR, FECHAR_FATURA
}
