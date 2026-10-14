package br.com.core4erp.config.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.spi.LoggingEventBuilder;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;

/**
 * Trilha de eventos de segurança (login, senha, permissões, LGPD...).
 *
 * <p>Todos os eventos saem pelo logger dedicado {@value #LOGGER} usando a API fluente do SLF4J,
 * com o par chave-valor {@code evento=<CODIGO>} — o logback em JSON inclui os key-values e o MDC
 * (requestId, ip, usuarioId, empresaId). Uso:
 * <pre>{@code
 * EventoSeguranca.warn("LOGIN_FALHA")
 *     .addKeyValue("emailHash", EventoSeguranca.hashEmail(email))
 *     .log("Falha de login");
 * }</pre>
 *
 * <p>O encoder ECS do Spring Boot DESCARTA o evento inteiro quando uma chave se repete
 * ("Duplicate nested pairs"). Por isso os builders daqui passam por {@link EventoSegurancaBuilder}:
 * chave igual ao MDC com o mesmo valor é omitida; com valor diferente vira {@code <chave>Alvo}
 * (ex.: {@code usuarioIdAlvo} = usuário afetado, {@code usuarioId} do MDC = quem agiu).
 *
 * <p><b>Nunca</b> registrar e-mail em claro, senha, token ou hash de senha (LGPD).
 */
public final class EventoSeguranca {

    public static final String LOGGER = "br.com.core4erp.seguranca";

    public static final String LOGIN_SUCESSO = "LOGIN_SUCESSO";
    public static final String LOGIN_FALHA = "LOGIN_FALHA";
    public static final String LOGIN_BLOQUEADO = "LOGIN_BLOQUEADO";
    public static final String CONTA_BLOQUEADA = "CONTA_BLOQUEADA";
    public static final String REGISTRO = "REGISTRO";
    public static final String SENHA_ALTERADA = "SENHA_ALTERADA";
    public static final String SENHA_RESET_SOLICITADO = "SENHA_RESET_SOLICITADO";
    public static final String SENHA_RESET_CONCLUIDO = "SENHA_RESET_CONCLUIDO";
    public static final String LOGOUT_TODOS = "LOGOUT_TODOS";
    public static final String TOKEN_REVOGADO = "TOKEN_REVOGADO";
    public static final String PERMISSAO_NEGADA = "PERMISSAO_NEGADA";
    public static final String ESCALADA_PRIVILEGIO_NEGADA = "ESCALADA_PRIVILEGIO_NEGADA";
    public static final String ACESSO_CROSS_TENANT = "ACESSO_CROSS_TENANT";
    public static final String ADMIN_ACESSO_EMPRESA = "ADMIN_ACESSO_EMPRESA";
    public static final String PERFIL_ALTERADO = "PERFIL_ALTERADO";
    public static final String PERMISSAO_ALTERADA = "PERMISSAO_ALTERADA";
    public static final String MEMBRO_REMOVIDO = "MEMBRO_REMOVIDO";
    public static final String MEMBRO_REATIVADO = "MEMBRO_REATIVADO";
    public static final String CONVITE_ENVIADO = "CONVITE_ENVIADO";
    public static final String CONVITE_ACEITO = "CONVITE_ACEITO";
    public static final String MEMBRO_ADICIONADO_DIRETAMENTE = "MEMBRO_ADICIONADO_DIRETAMENTE";
    public static final String CONTA_EXCLUIDA = "CONTA_EXCLUIDA";
    public static final String DADOS_EXPORTADOS = "DADOS_EXPORTADOS";
    public static final String SENHA_PROVISORIA_BLOQUEIO = "SENHA_PROVISORIA_BLOQUEIO";
    public static final String ORIGEM_BLOQUEADA = "ORIGEM_BLOQUEADA";
    public static final String RATE_LIMIT = "RATE_LIMIT";

    private static final Logger LOG = LoggerFactory.getLogger(LOGGER);

    private EventoSeguranca() {}

    public static LoggingEventBuilder info(String evento) {
        return new EventoSegurancaBuilder(LOG.atInfo()).addKeyValue("evento", evento);
    }

    public static LoggingEventBuilder warn(String evento) {
        return new EventoSegurancaBuilder(LOG.atWarn()).addKeyValue("evento", evento);
    }

    /**
     * Pseudonimiza o e-mail para correlação em logs: SHA-256 do e-mail normalizado
     * (trim + minúsculas), truncado em 16 hex. Não é reversível na prática e permite
     * agrupar tentativas sobre a mesma conta sem expor o dado pessoal.
     */
    public static String hashEmail(String email) {
        if (email == null) return "null";
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(email.trim().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest, 0, 8);
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 é obrigatório em toda JVM — nunca ocorre
            throw new IllegalStateException(e);
        }
    }
}
