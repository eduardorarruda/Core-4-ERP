package br.com.core4erp.observabilidade.logging;

import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.AppenderBase;

import java.util.concurrent.LinkedBlockingQueue;

public class DatabaseLogAppender extends AppenderBase<ILoggingEvent> {

    private static final LinkedBlockingQueue<ILoggingEvent> QUEUE = new LinkedBlockingQueue<>(1000);

    public static LinkedBlockingQueue<ILoggingEvent> getQueue() {
        return QUEUE;
    }

    @Override
    protected void append(ILoggingEvent event) {
        if (event.getLoggerName().startsWith("br.com.core4erp.observabilidade")) {
            return;
        }
        QUEUE.offer(event);
    }
}
