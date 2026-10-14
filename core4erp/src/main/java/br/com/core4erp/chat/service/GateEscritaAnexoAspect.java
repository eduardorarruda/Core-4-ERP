package br.com.core4erp.chat.service;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Portão técnico contra prompt injection via anexos: num turno que contém arquivo anexado
 * ({@link TurnoAnexoHolder}), TODA ferramenta de escrita do chat é bloqueada e devolve ao modelo a
 * instrução "confirmação necessária" ({@link ConfirmacaoNecessariaException}). A execução só ocorre
 * no turno seguinte, quando o usuário confirma — e esse turno não carrega mais o conteúdo do arquivo
 * (o histórico guarda só um resumo), então instruções escondidas no documento não chegam a executar
 * nada sem o "sim" do usuário.
 *
 * <p>Classificação fail-safe: só são liberadas as ferramentas de LEITURA (prefixos em
 * {@link #PREFIXOS_LEITURA}); qualquer ferramenta nova cai como escrita e fica bloqueada até ser
 * classificada aqui.
 */
@Aspect
@Component
public class GateEscritaAnexoAspect {

    private static final Logger log = LoggerFactory.getLogger(GateEscritaAnexoAspect.class);

    /** Ferramentas sem efeito em dados financeiros (consulta e geração de relatório). */
    static final List<String> PREFIXOS_LEITURA = List.of("consultar", "gerarRelatorio");

    @Around("@annotation(org.springframework.ai.tool.annotation.Tool) && within(br.com.core4erp.chat.tools..*)")
    public Object verificar(ProceedingJoinPoint jp) throws Throwable {
        String ferramenta = jp.getSignature().getName();
        if (TurnoAnexoHolder.isTurnoComAnexo() && isEscrita(ferramenta)) {
            log.atInfo()
                    .addKeyValue("evento", "chat.escrita_bloqueada_anexo")
                    .addKeyValue("ferramenta", ferramenta)
                    .log("[CHAT-ANEXO] escrita bloqueada até confirmação do usuário");
            throw new ConfirmacaoNecessariaException(ferramenta);
        }
        return jp.proceed();
    }

    static boolean isEscrita(String ferramenta) {
        if (ferramenta == null) {
            return true;
        }
        return PREFIXOS_LEITURA.stream().noneMatch(ferramenta::startsWith);
    }
}
