package br.com.core4erp.chat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Estado de sincronização do RAG por empresa/período. Tabela de infraestrutura escrita pelo
 * scheduler (fora de requisição HTTP), por isso NÃO estende {@code TenantEntity} — o
 * {@code empresaId} é gravado explicitamente, nunca inferido do {@code TenantContext} (que está
 * vazio em schedulers).
 */
@Getter
@Setter
@Entity
@Table(name = "tb_rag_sync")
public class RagSync {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "empresa_id", nullable = false)
    private Long empresaId;

    @Column(name = "tipo_resumo", nullable = false, length = 40)
    private String tipoResumo;

    @Column(length = 7)
    private String periodo;

    @Column(name = "hash_conteudo", nullable = false, length = 64)
    private String hashConteudo;

    @Column(name = "doc_id", nullable = false, length = 80)
    private String docId;

    @Column(name = "sincronizado_em", nullable = false)
    private LocalDateTime sincronizadoEm = LocalDateTime.now();
}
