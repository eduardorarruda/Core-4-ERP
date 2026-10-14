package br.com.core4erp.auth.service;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class TentativasLoginServiceTest {

    /** Relógio controlável para simular a passagem do tempo. */
    private static final class RelogioFalso extends Clock {
        private final AtomicReference<Instant> agora = new AtomicReference<>(Instant.parse("2026-10-13T12:00:00Z"));

        void avancar(Duration d) { agora.updateAndGet(i -> i.plus(d)); }
        @Override public java.time.ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zone) { return this; }
        @Override public Instant instant() { return agora.get(); }
    }

    private final RelogioFalso relogio = new RelogioFalso();
    private final TentativasLoginService service = new TentativasLoginService(relogio);

    @Test
    void bloqueiaNaQuintaFalha_eSoParaOMesmoIp() {
        for (int i = 1; i < TentativasLoginService.FALHAS_ANTES_DO_BLOQUEIO; i++) {
            assertThat(service.registrarFalha("a@b.com", "6.6.6.6")).isNull();
        }
        assertThat(service.estaBloqueado("a@b.com", "6.6.6.6")).isFalse();

        assertThat(service.registrarFalha("a@b.com", "6.6.6.6")).isEqualTo(Duration.ofMinutes(1));

        assertThat(service.estaBloqueado("a@b.com", "6.6.6.6")).isTrue();
        assertThat(service.estaBloqueado("a@b.com", "1.1.1.1")).isFalse();
        assertThat(service.estaBloqueado("outra@b.com", "6.6.6.6")).isFalse();
    }

    @Test
    void emailNormalizado_maiusculasEEspacosContamJuntos() {
        for (int i = 0; i < TentativasLoginService.FALHAS_ANTES_DO_BLOQUEIO; i++) {
            service.registrarFalha(i % 2 == 0 ? "A@B.com" : " a@b.com ", "6.6.6.6");
        }
        assertThat(service.estaBloqueado("a@b.com", "6.6.6.6")).isTrue();
    }

    @Test
    void bloqueioExpiraComOTempo() {
        for (int i = 0; i < TentativasLoginService.FALHAS_ANTES_DO_BLOQUEIO; i++) {
            service.registrarFalha("a@b.com", "6.6.6.6");
        }
        relogio.avancar(Duration.ofSeconds(61));
        assertThat(service.estaBloqueado("a@b.com", "6.6.6.6")).isFalse();
    }

    @Test
    void backoffProgressivo_dobraAteOTeto() {
        assertThat(TentativasLoginService.duracaoBloqueio(5)).isEqualTo(Duration.ofMinutes(1));
        assertThat(TentativasLoginService.duracaoBloqueio(6)).isEqualTo(Duration.ofMinutes(2));
        assertThat(TentativasLoginService.duracaoBloqueio(7)).isEqualTo(Duration.ofMinutes(4));
        assertThat(TentativasLoginService.duracaoBloqueio(8)).isEqualTo(Duration.ofMinutes(8));
        assertThat(TentativasLoginService.duracaoBloqueio(9)).isEqualTo(Duration.ofMinutes(15));
        assertThat(TentativasLoginService.duracaoBloqueio(500)).isEqualTo(Duration.ofMinutes(15));
    }

    @Test
    void sucessoLimpaOContador() {
        for (int i = 0; i < TentativasLoginService.FALHAS_ANTES_DO_BLOQUEIO; i++) {
            service.registrarFalha("a@b.com", "6.6.6.6");
        }
        service.limpar("a@b.com", "6.6.6.6");
        assertThat(service.estaBloqueado("a@b.com", "6.6.6.6")).isFalse();
        assertThat(service.registrarFalha("a@b.com", "6.6.6.6")).isNull();
    }
}
