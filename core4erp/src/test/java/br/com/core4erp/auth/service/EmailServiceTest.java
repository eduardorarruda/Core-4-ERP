package br.com.core4erp.auth.service;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EmailServiceTest {

    @Test
    void template_escapaValoresDinamicos() {
        String html = EmailService.montarHtml(new EmailService.ConteudoEmail(
                "<b>T</b>", "parágrafo", "Botão\"", "https://x/a?token=1&b=<x>", "aviso"));
        assertThat(html).contains("&lt;b&gt;T&lt;/b&gt;").contains("token=1&amp;b=&lt;x&gt;")
                .doesNotContain("<b>T</b>").contains("100%");
    }

    @Test
    void convite_nomeDaEmpresaComHtmlEhEscapadoNoCorpoESemQuebraNoAssunto() throws Exception {
        JavaMailSender sender = mock(JavaMailSender.class);
        when(sender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        EmailService service = new EmailService(sender, true, new MockEnvironment());
        ReflectionTestUtils.setField(service, "mailFrom", "noreply@core4erp.com");

        service.enviarConvite("novo@x.com", "tok", "https://app",
                "ACME <a href=\"https://phish\">clique</a>\r\nBcc: x@y.com");

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(sender).send(captor.capture());
        MimeMessage msg = captor.getValue();
        String html = textoDe(msg.getContent());
        assertThat(html).contains("ACME &lt;a href=&quot;https://phish&quot;&gt;clique&lt;/a&gt;")
                .doesNotContain("<a href=\"https://phish\">");
        assertThat(msg.getSubject()).doesNotContain("\n").doesNotContain("\r");
    }

    /** Concatena o conteúdo textual de todas as partes (multipart aninhado). */
    private static String textoDe(Object conteudo) throws Exception {
        if (conteudo instanceof String s) return s;
        if (conteudo instanceof jakarta.mail.Multipart mp) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < mp.getCount(); i++) sb.append(textoDe(mp.getBodyPart(i).getContent()));
            return sb.toString();
        }
        return "";
    }

    @Test
    void assunto_removeControlesELimitaTamanho() {
        assertThat(EmailService.textoAssunto("A\r\nB")).isEqualTo("A  B");
        assertThat(EmailService.textoAssunto("x".repeat(200))).hasSize(80);
    }

    /** Captura os logs do EmailService (mensagem + pares chave/valor) para inspecionar o conteúdo. */
    private static ListAppender<ILoggingEvent> capturarLogs() {
        Logger logger = (Logger) LoggerFactory.getLogger(EmailService.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        return appender;
    }

    private static String textoDosLogs(ListAppender<ILoggingEvent> appender) {
        StringBuilder sb = new StringBuilder();
        for (ILoggingEvent e : appender.list) {
            sb.append(e.getFormattedMessage()).append(' ');
            if (e.getKeyValuePairs() != null) e.getKeyValuePairs().forEach(kv -> sb.append(kv.key).append('=').append(kv.value).append(' '));
        }
        return sb.toString();
    }

    @Test
    void envioDesligado_emProducao_naoEnviaENaoRegistraToken() {
        JavaMailSender sender = mock(JavaMailSender.class);
        MockEnvironment prod = new MockEnvironment();
        prod.setActiveProfiles("prod");
        EmailService service = new EmailService(sender, false, prod);
        ListAppender<ILoggingEvent> logs = capturarLogs();

        service.enviarResetSenha("fulano@x.com", "TOKEN-SECRETO", "https://app");
        service.enviarConvite("fulano@x.com", "TOKEN-CONVITE", "https://app", "ACME");

        verify(sender, never()).send(any(MimeMessage.class));
        verify(sender, never()).createMimeMessage();
        String texto = textoDosLogs(logs);
        assertThat(texto).contains("MAIL_ENABLED=false")
                .doesNotContain("TOKEN-SECRETO").doesNotContain("TOKEN-CONVITE").doesNotContain("fulano@x.com");
    }

    @Test
    void envioDesligado_foraDeProducao_registraLinkParaDemonstracao() {
        JavaMailSender sender = mock(JavaMailSender.class);
        EmailService service = new EmailService(sender, false, new MockEnvironment());
        ListAppender<ILoggingEvent> logs = capturarLogs();

        service.enviarResetSenha("fulano@x.com", "TOKEN-DEV", "http://localhost:5173");

        verify(sender, never()).send(any(MimeMessage.class));
        assertThat(textoDosLogs(logs)).contains("/redefinir-senha?token=TOKEN-DEV").doesNotContain("fulano@x.com");
    }
}
