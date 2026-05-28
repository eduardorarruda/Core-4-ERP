package br.com.core4erp.plano.gateway;

import br.com.core4erp.plano.entity.PagamentoMock;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

@Component
public class MockGatewayPagamento implements GatewayPagamento {

    @Override
    public Resultado processar(BigDecimal valor, String forma) {
        String referencia = "MOCK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return new Resultado(PagamentoMock.StatusPagamento.APROVADO, referencia);
    }
}
