package br.com.core4erp.chat.service;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.Ticker;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Registro (em memória, Caffeine) das AÇÕES CRÍTICAS pendentes de confirmação do usuário e do
 * contador de turnos por conversa — o estado do {@link GateAcaoCriticaAspect}.
 *
 * <ul>
 *   <li><b>Turno</b>: cada mensagem do usuário processada pelo pipeline interno recebe um número
 *       sequencial na conversa ({@link #iniciarTurno}).</li>
 *   <li><b>Pendência</b>: chave = usuário + conversa + ferramenta + hash canônico dos argumentos;
 *       guarda o turno em que foi registrada. Expira após o TTL ({@code chat.acao-critica.ttl-minutos},
 *       padrão 10).</li>
 *   <li><b>Autorização</b>: só quando a pendência foi registrada no turno IMEDIATAMENTE anterior e a
 *       mensagem atual é confirmação explícita; a pendência é removida atomicamente (uso único).</li>
 * </ul>
 *
 * <p>Estado local da instância: com mais de uma réplica sem afinidade, a confirmação que cair em
 * outra instância é bloqueada (fail-safe) e o usuário confirma de novo.
 */
@Component
public class AcoesCriticasPendentes {

    /** Pendência registrada: em qual turno e o resumo exibido ao usuário. */
    record Pendencia(long turno, String resumo) {}

    private static final long MAX_ENTRADAS = 10_000;

    private final Duration ttl;
    private final Cache<String, Pendencia> pendencias;
    private final Cache<String, AtomicLong> contadoresDeTurno;

    @Autowired
    public AcoesCriticasPendentes(@Value("${chat.acao-critica.ttl-minutos:10}") long ttlMinutos) {
        this(Duration.ofMinutes(ttlMinutos), Ticker.systemTicker());
    }

    /** Construtor de teste: permite controlar o relógio (expiração do TTL). */
    AcoesCriticasPendentes(Duration ttl, Ticker ticker) {
        this.ttl = ttl;
        this.pendencias = Caffeine.newBuilder()
                .expireAfterWrite(ttl)
                .maximumSize(MAX_ENTRADAS)
                .ticker(ticker)
                .build();
        // O contador vive pelo menos tanto quanto a pendência mais recente da conversa (cada turno o
        // acessa) — se expirar e recomeçar do 1, as pendências antigas também já expiraram.
        this.contadoresDeTurno = Caffeine.newBuilder()
                .expireAfterAccess(ttl.multipliedBy(2))
                .maximumSize(MAX_ENTRADAS)
                .ticker(ticker)
                .build();
    }

    public Duration ttl() {
        return ttl;
    }

    /** Abre um novo turno (nova mensagem do usuário) na conversa e devolve o seu snapshot. */
    public TurnoChatHolder.Turno iniciarTurno(Long conversaId, Long usuarioId, boolean confirmacaoExplicita) {
        long numero = contadoresDeTurno.get(chaveConversa(usuarioId, conversaId), k -> new AtomicLong())
                .incrementAndGet();
        return new TurnoChatHolder.Turno(conversaId, usuarioId, numero, confirmacaoExplicita);
    }

    /**
     * Consome a pendência se a execução estiver autorizada: mesma ferramenta + argumentos, registrada
     * no turno imediatamente anterior e mensagem atual de confirmação explícita. Atômico — duas
     * chamadas concorrentes não executam a mesma ação duas vezes.
     */
    public boolean autorizarEConsumir(TurnoChatHolder.Turno turno, String ferramenta, String hashArgumentos) {
        if (!turno.confirmacaoExplicita()) {
            return false;
        }
        String chave = chaveAcao(turno, ferramenta, hashArgumentos);
        Pendencia pendencia = pendencias.getIfPresent(chave);
        if (pendencia == null || pendencia.turno() != turno.numero() - 1) {
            return false;
        }
        return pendencias.asMap().remove(chave, pendencia);
    }

    /**
     * Registra (ou renova para o turno atual) a pendência. Devolve {@code false} se ela já tinha sido
     * registrada NESTE turno — o modelo repetiu a chamada sem esperar a resposta do usuário.
     */
    public boolean registrar(TurnoChatHolder.Turno turno, String ferramenta, String hashArgumentos, String resumo) {
        String chave = chaveAcao(turno, ferramenta, hashArgumentos);
        Pendencia anterior = pendencias.asMap().putIfAbsent(chave, new Pendencia(turno.numero(), resumo));
        if (anterior == null) {
            return true;
        }
        if (anterior.turno() == turno.numero()) {
            return false;
        }
        pendencias.put(chave, new Pendencia(turno.numero(), resumo));
        return true;
    }

    private static String chaveConversa(Long usuarioId, Long conversaId) {
        return usuarioId + ":" + conversaId;
    }

    private static String chaveAcao(TurnoChatHolder.Turno turno, String ferramenta, String hashArgumentos) {
        return chaveConversa(turno.usuarioId(), turno.conversaId()) + ":" + ferramenta + ":" + hashArgumentos;
    }
}
