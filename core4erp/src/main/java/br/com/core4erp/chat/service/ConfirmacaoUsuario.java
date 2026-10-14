package br.com.core4erp.chat.service;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Decide se a mensagem do usuário é uma CONFIRMAÇÃO EXPLÍCITA de uma ação crítica pendente
 * ({@link GateAcaoCriticaAspect}). Critério conservador (na dúvida, NÃO é confirmação — o custo é só
 * pedir de novo):
 * <ul>
 *   <li>texto normalizado (minúsculas, sem acentos/pontuação);</li>
 *   <li>COMEÇA com uma expressão afirmativa ("sim", "confirmo", "pode", "ok", "isso mesmo"...);</li>
 *   <li>NÃO contém negação/hesitação ("não", "cancela", "espera"...) em lugar nenhum;</li>
 *   <li>não é pergunta ("?") e é curta (até {@value #MAX_PALAVRAS} palavras).</li>
 * </ul>
 */
public final class ConfirmacaoUsuario {

    static final int MAX_PALAVRAS = 12;

    private static final Set<String> AFIRMATIVAS = Set.of(
            "sim", "s", "ss", "confirmo", "confirmar", "confirma", "confirmado", "confirmada",
            "pode", "ok", "okay", "okey", "claro", "prossiga", "prosseguir", "prossegue", "autorizo",
            "autorizado", "positivo", "manda", "fechado", "beleza", "blz", "perfeito", "certo",
            "correto", "exato", "yes", "y", "faca", "faz", "execute", "executa", "segue", "vai", "bora");

    /** Afirmativas de duas palavras cuja 1ª palavra sozinha não basta. */
    private static final List<String> AFIRMATIVAS_COMPOSTAS = List.of("isso mesmo", "isso ai", "pode ser");

    private static final Set<String> NEGACOES = Set.of(
            "nao", "n", "nem", "nunca", "jamais", "negativo", "cancela", "cancele", "cancelar",
            "cancelado", "cancelada", "pare", "parar", "espera", "espere", "aguarde", "aguarda",
            "desisto", "desista", "errado", "errada", "nope", "antes");

    private static final Pattern DIACRITICOS = Pattern.compile("\\p{M}+");
    private static final Pattern NAO_ALFANUMERICO = Pattern.compile("[^a-z0-9]+");

    private ConfirmacaoUsuario() {}

    public static boolean isConfirmacaoExplicita(String mensagem) {
        if (mensagem == null || mensagem.isBlank() || mensagem.contains("?")) {
            return false;
        }
        String normalizada = normalizar(mensagem);
        if (normalizada.isEmpty()) {
            return false;
        }
        String[] palavras = normalizada.split(" ");
        if (palavras.length > MAX_PALAVRAS) {
            return false;
        }
        if (Arrays.stream(palavras).anyMatch(NEGACOES::contains)) {
            return false;
        }
        return AFIRMATIVAS.contains(palavras[0])
                || AFIRMATIVAS_COMPOSTAS.stream().anyMatch(normalizada::startsWith);
    }

    static String normalizar(String texto) {
        String semAcento = DIACRITICOS.matcher(Normalizer.normalize(texto, Normalizer.Form.NFD)).replaceAll("");
        return NAO_ALFANUMERICO.matcher(semAcento.toLowerCase(Locale.ROOT)).replaceAll(" ").strip();
    }
}
