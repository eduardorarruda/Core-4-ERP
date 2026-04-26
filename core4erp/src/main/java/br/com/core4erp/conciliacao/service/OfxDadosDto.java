package br.com.core4erp.conciliacao.service;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class OfxDadosDto {
    private String bancoId;
    private String agencia;
    private String numeroConta;
    private LocalDate dataInicio;
    private LocalDate dataFim;
    private List<OfxTransacaoDto> transacoes;
}
