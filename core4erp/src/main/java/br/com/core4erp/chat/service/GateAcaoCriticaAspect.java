package br.com.core4erp.chat.service;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;
import java.util.StringJoiner;

/**
 * Portão técnico de CONFIRMAÇÃO EM DOIS TURNOS para ferramentas {@link AcaoCritica} (exclusão,
 * estorno, baixa, transferência, aporte/resgate, fechamento de fatura). Antes, a regra "confirme
 * antes" era só instrução de prompt — um modelo alucinando ou sob prompt injection executava direto.
 *
 * <ol>
 *   <li>1ª chamada no turno N: NÃO executa; registra a pendência (usuário + conversa + ferramenta +
 *       hash canônico dos argumentos, TTL ~10 min) e lança {@link ConfirmacaoNecessariaException} — o
 *       {@code ChatToolErrorConfig} devolve ao modelo "CONFIRMAÇÃO NECESSÁRIA" com o resumo.</li>
 *   <li>Turno N+1: executa só se a mensagem do usuário for confirmação explícita
 *       ({@link ConfirmacaoUsuario}) E a chamada repetir a mesma ferramenta com os mesmos argumentos.
 *       A pendência é consumida (uso único).</li>
 * </ol>
 *
 * <p>Sem turno do chat na thread ({@link TurnoChatHolder} vazio — ex.: chamada via MCP), a ação
 * crítica é sempre bloqueada (fail-safe). Roda ANTES do {@link GateEscritaAnexoAspect}: num turno com
 * anexo, a ação crítica também fica registrada, e o "sim" do turno seguinte a executa.
 */
@Aspect
@Component
@Order(1)
public class GateAcaoCriticaAspect {

    private static final Logger log = LoggerFactory.getLogger(GateAcaoCriticaAspect.class);
    private static final int MAX_CHARS_VALOR_RESUMO = 80;

    private final AcoesCriticasPendentes pendentes;

    public GateAcaoCriticaAspect(AcoesCriticasPendentes pendentes) {
        this.pendentes = pendentes;
    }

    @Around("@annotation(acaoCritica) && within(br.com.core4erp.chat.tools..*)")
    public Object verificar(ProceedingJoinPoint jp, AcaoCritica acaoCritica) throws Throwable {
        String ferramenta = jp.getSignature().getName();
        TurnoChatHolder.Turno turno = TurnoChatHolder.atual();
        if (turno == null || turno.conversaId() == null || turno.usuarioId() == null) {
            log.atWarn()
                    .addKeyValue("evento", "chat.acao_critica_sem_turno")
                    .addKeyValue("ferramenta", ferramenta)
                    .log("[CHAT-ACAO-CRITICA] bloqueada: chamada fora de um turno do chat");
            throw ConfirmacaoNecessariaException.semTurnoDeChat(ferramenta);
        }

        String[] nomes = nomesDosParametros(jp);
        Object[] args = jp.getArgs();
        String hash = hashCanonico(ferramenta, nomes, args);

        if (pendentes.autorizarEConsumir(turno, ferramenta, hash)) {
            log.atInfo()
                    .addKeyValue("evento", "chat.acao_critica_confirmada")
                    .addKeyValue("ferramenta", ferramenta)
                    .addKeyValue("conversaId", turno.conversaId())
                    .addKeyValue("usuarioId", turno.usuarioId())
                    .log("[CHAT-ACAO-CRITICA] executando após confirmação do usuário");
            return jp.proceed();
        }

        String resumo = acaoCritica.value() + resumoArgumentos(nomes, args);
        boolean novaPendencia = pendentes.registrar(turno, ferramenta, hash, resumo);
        log.atInfo()
                .addKeyValue("evento", "chat.acao_critica_pendente")
                .addKeyValue("ferramenta", ferramenta)
                .addKeyValue("conversaId", turno.conversaId())
                .addKeyValue("usuarioId", turno.usuarioId())
                .addKeyValue("repetidaNoMesmoTurno", !novaPendencia)
                .log("[CHAT-ACAO-CRITICA] bloqueada até confirmação do usuário");
        throw ConfirmacaoNecessariaException.acaoCritica(ferramenta, resumo, !novaPendencia,
                pendentes.ttl().toMinutes());
    }

    private static String[] nomesDosParametros(ProceedingJoinPoint jp) {
        String[] nomes = jp.getSignature() instanceof MethodSignature ms ? ms.getParameterNames() : null;
        int n = jp.getArgs().length;
        if (nomes != null && nomes.length == n) {
            return nomes;
        }
        String[] gerados = new String[n];
        for (int i = 0; i < n; i++) gerados[i] = "arg" + i;
        return gerados;
    }

    /** SHA-256 de "ferramenta|nome=valorCanônico|...": a confirmação vale só para os MESMOS argumentos. */
    static String hashCanonico(String ferramenta, String[] nomes, Object[] args) {
        StringJoiner canonico = new StringJoiner("|").add(ferramenta);
        for (int i = 0; i < args.length; i++) {
            canonico.add(nomes[i] + "=" + canonizar(args[i]));
        }
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(canonico.toString().getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível na JVM", e);
        }
    }

    /** Normaliza variações irrelevantes: 150 == 150.00; "Nubank " == "nubank" (resolvers ignoram caixa). */
    static String canonizar(Object valor) {
        if (valor == null) {
            return "∅";
        }
        if (valor instanceof BigDecimal bd) {
            return bd.signum() == 0 ? "0" : bd.stripTrailingZeros().toPlainString();
        }
        if (valor instanceof String s) {
            return s.strip().toLowerCase(Locale.ROOT);
        }
        return String.valueOf(valor);
    }

    private static String resumoArgumentos(String[] nomes, Object[] args) {
        StringJoiner partes = new StringJoiner(", ", " (", ")").setEmptyValue("");
        for (int i = 0; i < args.length; i++) {
            if (args[i] == null) continue;
            String valor = args[i] instanceof BigDecimal bd ? bd.toPlainString() : String.valueOf(args[i]);
            valor = valor.replaceAll("[\\r\\n\\t]+", " ").strip();
            if (valor.length() > MAX_CHARS_VALOR_RESUMO) {
                valor = valor.substring(0, MAX_CHARS_VALOR_RESUMO) + "…";
            }
            partes.add(nomes[i] + "=" + valor);
        }
        return partes.toString();
    }
}
