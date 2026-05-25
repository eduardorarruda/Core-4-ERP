package br.com.core4erp.empresa.service;

import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.empresa.entity.AcaoAuditoria;
import br.com.core4erp.empresa.entity.Auditoria;
import br.com.core4erp.empresa.repository.AuditoriaRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AuditoriaService {

    private static final Set<String> CAMPOS_BLOQUEADOS = Set.of(
        "senhaHash", "senha", "resetToken", "resetTokenExpiry"
    );

    private final AuditoriaRepository auditoriaRepository;
    private final TenantContext tenantContext;
    private final ObjectMapper objectMapper;

    public void registrar(String entidade, Long entidadeId, AcaoAuditoria acao,
                          Object valorAnterior, Object valorNovo) {
        Auditoria a = new Auditoria();
        a.setEmpresaId(tenantContext.getEmpresaId());
        a.setUsuarioId(tenantContext.getUsuarioId());
        a.setEntidade(entidade);
        a.setEntidadeId(entidadeId);
        a.setAcao(acao);
        a.setValorAnterior(toJsonSanitizado(valorAnterior));
        a.setValorNovo(toJsonSanitizado(valorNovo));
        a.setIpAddress(MDC.get("ipAddress"));
        a.setRequestId(MDC.get("requestId"));
        a.setTimestamp(LocalDateTime.now());
        auditoriaRepository.save(a);
    }

    private String toJsonSanitizado(Object obj) {
        if (obj == null) return null;
        try {
            String json = objectMapper.writeValueAsString(obj);
            JsonNode node = objectMapper.readTree(json);
            if (node instanceof ObjectNode on) {
                CAMPOS_BLOQUEADOS.forEach(on::remove);
            }
            return objectMapper.writeValueAsString(node);
        } catch (JsonProcessingException e) {
            return "{}";
        }
    }
}
