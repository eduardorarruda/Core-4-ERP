package br.com.core4erp.chat.tools.relatorio;

/**
 * Carrega a URL do último relatório gerado na thread atual.
 *
 * <p>No chat, a tool de relatório roda na MESMA thread da chamada ao modelo (a execução
 * de tools do {@code .call()} é síncrona). Assim o {@code ChatService} lê aqui a URL real
 * gerada pela tool e a anexa à resposta — sem depender do modelo escrever o link (que às
 * vezes alucinava um domínio de exemplo).
 */
public final class RelatorioDownloadHolder {

    private static final ThreadLocal<String> URL = new ThreadLocal<>();

    private RelatorioDownloadHolder() {}

    public static void set(String url) {
        URL.set(url);
    }

    public static String getAndClear() {
        String u = URL.get();
        URL.remove();
        return u;
    }

    public static void clear() {
        URL.remove();
    }
}
