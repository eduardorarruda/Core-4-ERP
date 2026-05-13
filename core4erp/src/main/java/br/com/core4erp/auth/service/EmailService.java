package br.com.core4erp.auth.service;

import br.com.core4erp.exception.BusinessException;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String mailFrom;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Async
    public void enviarResetSenha(String para, String token, String frontendUrl) {
        String link = frontendUrl + "/redefinir-senha?token=" + token;

        String html = """
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head><meta charset="UTF-8"></head>
                <body style="margin:0;padding:0;background:#0c0c0c;font-family:'DM Sans',Arial,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0c0c0c;padding:40px 20px;">
                    <tr><td align="center">
                      <table width="520" cellpadding="0" cellspacing="0"
                             style="background:#131313;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;">
                        <tr>
                          <td style="background:linear-gradient(135deg,#0d1f15,#131313);padding:32px 40px;text-align:center;border-bottom:1px solid rgba(110,255,192,.1);">
                            <div style="font-size:22px;font-weight:700;color:#fafafa;letter-spacing:-0.02em;">
                              Core <span style="color:#6EFFC0;">4</span> ERP
                            </div>
                            <div style="font-size:10px;color:rgba(250,250,250,.3);letter-spacing:.12em;text-transform:uppercase;margin-top:4px;">
                              Enterprise Finance
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:40px;">
                            <p style="font-size:22px;font-weight:700;color:#fafafa;margin:0 0 12px;letter-spacing:-0.02em;">
                              Redefinição de senha
                            </p>
                            <p style="font-size:14px;color:rgba(250,250,250,.55);line-height:1.7;margin:0 0 28px;">
                              Recebemos uma solicitação para redefinir a senha da sua conta Core 4 ERP.
                              Clique no botão abaixo para criar uma nova senha. O link é válido por
                              <strong style="color:#fafafa;">60 minutos</strong>.
                            </p>
                            <div style="text-align:center;margin-bottom:28px;">
                              <a href="%s"
                                 style="display:inline-block;padding:14px 32px;background:#6EFFC0;color:#003824;
                                        font-weight:700;font-size:15px;border-radius:12px;text-decoration:none;
                                        letter-spacing:-0.01em;">
                                Redefinir minha senha
                              </a>
                            </div>
                            <p style="font-size:12px;color:rgba(250,250,250,.35);line-height:1.7;margin:0 0 8px;">
                              Se o botão não funcionar, copie e cole este link no seu navegador:
                            </p>
                            <p style="font-size:11px;color:rgba(110,255,192,.6);word-break:break-all;
                                      font-family:monospace;background:rgba(110,255,192,.04);
                                      border:1px solid rgba(110,255,192,.12);border-radius:8px;
                                      padding:10px 12px;margin:0 0 28px;">
                              %s
                            </p>
                            <p style="font-size:12px;color:rgba(250,250,250,.35);line-height:1.7;margin:0;">
                              Se você não solicitou a redefinição de senha, ignore este e-mail.
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,.06);
                                     text-align:center;font-size:10px;color:rgba(250,250,250,.2);
                                     font-family:monospace;letter-spacing:.08em;text-transform:uppercase;">
                            © 2026 Core 4 ERP · LGPD · Este e-mail foi enviado automaticamente
                          </td>
                        </tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(link, link);

        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(mailFrom);
            helper.setTo(para);
            helper.setSubject("Core 4 ERP — Redefinição de senha");
            helper.setText(html, true);
            mailSender.send(msg);
        } catch (MessagingException e) {
            log.error("Falha ao enviar e-mail de reset para {}: {}", para, e.getMessage());
            throw new BusinessException("EMAIL_INDISPONIVEL",
                    "Não foi possível enviar o e-mail de recuperação. Verifique o endereço e tente novamente.");
        }
    }
}
