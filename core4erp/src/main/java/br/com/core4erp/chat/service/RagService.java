package br.com.core4erp.chat.service;

import br.com.core4erp.config.tenant.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * RAG (Retrieval-Augmented Generation) sobre o conteúdo NÃO-estruturado do usuário: documentos
 * enviados, base de conhecimento e descrições de texto. Os dados estruturados (saldos, lançamentos)
 * continuam sendo atendidos pelas ferramentas (function-calling), que são exatas e ao vivo.
 *
 * <p><b>Isolamento por empresa (crítico):</b> cada trecho indexado leva o {@code empresaId} no
 * metadado, e a recuperação SEMPRE filtra por {@code empresaId} do tenant atual — assim a busca
 * semântica nunca devolve conteúdo de outra empresa. A recuperação é resiliente: qualquer falha
 * (Qdrant fora, embedding indisponível) retorna vazio e o chat segue normalmente.
 */
@Service
public class RagService {

    private static final Logger log = LoggerFactory.getLogger(RagService.class);

    private static final int TOP_K = 4;
    private static final double LIMIAR = 0.4;   // similaridade mínima p/ considerar relevante
    private static final int CHUNK_CHARS = 1000; // tamanho do trecho indexado

    private final VectorStore vectorStore;
    private final TenantContext tenantCtx;

    public RagService(VectorStore vectorStore, TenantContext tenantCtx) {
        this.vectorStore = vectorStore;
        this.tenantCtx = tenantCtx;
    }

    /** Indexa um texto para a empresa atual (quebrado em trechos). Retorna quantos trechos foram gravados. */
    public int indexar(String texto, String tipo, String fonte) {
        Long eid = tenantCtx.getEmpresaId();
        if (eid == null) {
            throw new IllegalStateException("Contexto de empresa não disponível para indexar.");
        }
        if (texto == null || texto.isBlank()) return 0;

        List<Document> docs = new ArrayList<>();
        for (String trecho : chunk(texto)) {
            docs.add(new Document(trecho, Map.of(
                    "empresaId", eid.toString(),
                    "tipo", tipo == null || tipo.isBlank() ? "documento" : tipo,
                    "fonte", fonte == null ? "" : fonte)));
        }
        if (docs.isEmpty()) return 0;
        vectorStore.add(docs);
        log.info("[RAG] indexado empresaId={} tipo={} fonte={} trechos={}", eid, tipo, fonte, docs.size());
        return docs.size();
    }

    /**
     * Recupera trechos relevantes à pergunta, filtrados pela empresa atual, e devolve um bloco de
     * "material de referência" pronto para anexar ao system prompt. Vazio se não houver nada relevante.
     */
    public String recuperarContexto(String pergunta) {
        Long eid = tenantCtx.getEmpresaId();
        if (eid == null || pergunta == null || pergunta.isBlank()) return "";
        try {
            List<Document> docs = vectorStore.similaritySearch(
                    SearchRequest.builder()
                            .query(pergunta)
                            .topK(TOP_K)
                            .similarityThreshold(LIMIAR)
                            .filterExpression("empresaId == '" + eid + "'")
                            .build());
            if (docs == null || docs.isEmpty()) return "";
            String ctx = docs.stream().map(Document::getText).collect(Collectors.joining("\n---\n"));
            return """
                    ## MATERIAL DE REFERÊNCIA (RAG)
                    Trechos recuperados dos documentos/conhecimento do usuário. Use SOMENTE se forem
                    relevantes para a pergunta atual; caso contrário, ignore e responda normalmente com
                    suas ferramentas. Não invente nada além disto e dos dados das ferramentas.

                    %s
                    """.formatted(ctx);
        } catch (Exception e) {
            // RAG é complementar — nunca pode derrubar o chat.
            log.warn("[RAG] falha na recuperação (seguindo sem contexto): {}", e.getMessage());
            return "";
        }
    }

    private List<String> chunk(String texto) {
        String t = texto.strip();
        List<String> partes = new ArrayList<>();
        for (int i = 0; i < t.length(); i += CHUNK_CHARS) {
            partes.add(t.substring(i, Math.min(t.length(), i + CHUNK_CHARS)));
        }
        return partes;
    }
}
