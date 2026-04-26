package br.com.core4erp.conciliacao.service;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
public class OfxTransacaoDto {
    private String ofxId;
    private String tipo;
    private BigDecimal valor;
    private LocalDate data;
    private String memo;
    private String nome;
}
