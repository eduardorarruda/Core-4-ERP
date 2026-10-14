package br.com.core4erp.auth.service;

import br.com.core4erp.config.security.EventoSeguranca;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

/**
 * Bloqueio temporário de login por <b>(conta + IP do cliente)</b>, em memória (Caffeine), com
 * backoff progressivo.
 *
 * <p>Com o bloqueio só por conta, qualquer pessoa (de qualquer IP) que errasse a senha 5 vezes
 * trancava o dono legítimo fora (DoS de lockout). Aqui o contador é por e-mail + IP: quem ataca de
 * outro IP só bloqueia a si mesmo. O bloqueio por conta no banco continua existindo apenas como rede
 * de segurança com limite alto (ver {@code AuthService.MAX_FALHAS_CONTA}).
 *
 * <p>Vale igualmente para e-mails inexistentes — o comportamento não denuncia se a conta existe.
 * A chave guarda só o hash do e-mail (LGPD). Estado por instância: em várias réplicas o limite
 * efetivo multiplica, o que é aceitável junto ao rate limit por IP.
 */
@Component
public class TentativasLoginService {

    /** Falhas seguidas (mesmo e-mail + IP) antes do primeiro bloqueio. */
    static final int FALHAS_ANTES_DO_BLOQUEIO = 5;
    static final Duration BLOQUEIO_INICIAL = Duration.ofMinutes(1);
    static final Duration BLOQUEIO_MAXIMO = Duration.ofMinutes(15);
    /** Sem novas falhas por este período, o contador é esquecido. */
    private static final Duration JANELA_ESQUECIMENTO = Duration.ofHours(1);
    private static final long MAX_CHAVES = 100_000;
    /** Teto do expoente do backoff (evita overflow do deslocamento). */
    private static final int MAX_DOBRAS = 10;

    private record Estado(int falhas, Instant bloqueadoAte) {}

    private final Cache<String, Estado> estados = Caffeine.newBuilder()
            .expireAfterWrite(JANELA_ESQUECIMENTO)
            .maximumSize(MAX_CHAVES)
            .build();
    private final Clock clock;

    public TentativasLoginService() {
        this(Clock.systemUTC());
    }

    TentativasLoginService(Clock clock) {
        this.clock = clock;
    }

    /** {@code true} se este e-mail está bloqueado PARA ESTE IP neste momento. */
    public boolean estaBloqueado(String email, String ip) {
        Estado estado = estados.getIfPresent(chave(email, ip));
        return estado != null && estado.bloqueadoAte() != null && estado.bloqueadoAte().isAfter(clock.instant());
    }

    /**
     * Conta uma falha para (e-mail, IP). A partir da {@value #FALHAS_ANTES_DO_BLOQUEIO}ª falha bloqueia
     * por 1 min e dobra a cada nova falha (2, 4, 8…) até 15 min.
     *
     * @return a duração do bloqueio aplicado agora, ou {@code null} se ainda não bloqueou
     */
    public Duration registrarFalha(String email, String ip) {
        Instant agora = clock.instant();
        Estado novo = estados.asMap().compute(chave(email, ip), (k, atual) -> {
            int falhas = (atual == null ? 0 : atual.falhas()) + 1;
            Instant ate = falhas >= FALHAS_ANTES_DO_BLOQUEIO ? agora.plus(duracaoBloqueio(falhas)) : null;
            return new Estado(falhas, ate);
        });
        return novo.bloqueadoAte() == null ? null : duracaoBloqueio(novo.falhas());
    }

    /** Login bem-sucedido: zera o contador deste (e-mail, IP). */
    public void limpar(String email, String ip) {
        estados.invalidate(chave(email, ip));
    }

    static Duration duracaoBloqueio(int falhas) {
        int dobras = Math.min(Math.max(falhas - FALHAS_ANTES_DO_BLOQUEIO, 0), MAX_DOBRAS);
        Duration progressiva = BLOQUEIO_INICIAL.multipliedBy(1L << dobras);
        return progressiva.compareTo(BLOQUEIO_MAXIMO) > 0 ? BLOQUEIO_MAXIMO : progressiva;
    }

    private static String chave(String email, String ip) {
        return EventoSeguranca.hashEmail(email) + "|" + ip;
    }
}
