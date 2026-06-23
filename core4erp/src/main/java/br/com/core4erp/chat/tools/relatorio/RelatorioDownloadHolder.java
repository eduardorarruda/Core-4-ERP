package br.com.core4erp.chat.tools.relatorio;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Carrega a URL do último relatório gerado, por usuário.
 *
 * <p>No streaming, a tool de relatório roda numa thread do Reactor, enquanto o
 * {@code ChatService} lê a URL na thread que assina o fluxo — threads diferentes. Por isso
 * o armazenamento é um mapa chaveado pelo {@code usuarioId} (visível entre threads), e não um
 * {@code ThreadLocal}. Assim o {@code ChatService} anexa o link real gerado pela tool, sem
 * depender de o modelo escrever a URL (que às vezes alucinava um domínio de exemplo).
 */
public final class RelatorioDownloadHolder {

    private static final Map<Long, String> URLS = new ConcurrentHashMap<>();

    private RelatorioDownloadHolder() {}

    public static void set(Long usuarioId, String url) {
        if (usuarioId != null && url != null) {
            URLS.put(usuarioId, url);
        }
    }

    public static String getAndClear(Long usuarioId) {
        return usuarioId != null ? URLS.remove(usuarioId) : null;
    }

    public static void clear(Long usuarioId) {
        if (usuarioId != null) {
            URLS.remove(usuarioId);
        }
    }
}
