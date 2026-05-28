package br.com.core4erp.plano.gateway;

import br.com.core4erp.plano.entity.PagamentoMock;

import java.math.BigDecimal;

public interface GatewayPagamento {

    record Resultado(PagamentoMock.StatusPagamento status, String referencia) {}

    Resultado processar(BigDecimal valor, String forma);
}
