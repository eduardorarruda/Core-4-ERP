package br.com.core4erp.chat.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicInteger;

@Component
public class ChatMetrics {

    private final Counter totalMensagens;
    private final Counter totalErros;
    private final Timer tempoChatTimer;
    private final AtomicInteger sessoesAtivas;

    public ChatMetrics(MeterRegistry registry) {
        this.totalMensagens = Counter.builder("chat.mensagens.total")
                .description("Total de mensagens processadas pelo assistente IA")
                .register(registry);

        this.totalErros = Counter.builder("chat.erros.total")
                .description("Total de erros no chat IA")
                .register(registry);

        this.tempoChatTimer = Timer.builder("chat.processamento.duracao")
                .description("Tempo de processamento de cada mensagem do chat")
                .publishPercentiles(0.5, 0.95, 0.99)
                .register(registry);

        this.sessoesAtivas = registry.gauge("chat.sessoes.ativas", new AtomicInteger(0));
    }

    public void registrarMensagem() {
        totalMensagens.increment();
    }

    public void registrarErro() {
        totalErros.increment();
    }

    public Timer.Sample iniciarTimer() {
        return Timer.start();
    }

    public void finalizarTimer(Timer.Sample sample) {
        sample.stop(tempoChatTimer);
    }

    public void incrementarSessoes() {
        sessoesAtivas.incrementAndGet();
    }

    public void decrementarSessoes() {
        sessoesAtivas.decrementAndGet();
    }
}
