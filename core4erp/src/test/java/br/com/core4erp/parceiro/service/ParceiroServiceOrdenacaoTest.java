package br.com.core4erp.parceiro.service;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import static org.assertj.core.api.Assertions.assertThat;

class ParceiroServiceOrdenacaoTest {

    @Test
    void ordenacaoPorCpfCnpj_descartada_caiNaRazaoSocial() {
        Pageable p = ParceiroService.ordenacaoPermitida(PageRequest.of(1, 50, Sort.by("cpfCnpj")));

        assertThat(p.getSort()).isEqualTo(Sort.by("razaoSocial"));
        assertThat(p.getPageNumber()).isEqualTo(1);
        assertThat(p.getPageSize()).isEqualTo(50);
    }

    @Test
    void ordenacaoPermitida_mantida_eIndiceCegoDescartado() {
        Pageable p = ParceiroService.ordenacaoPermitida(
                PageRequest.of(0, 20, Sort.by(Sort.Order.desc("municipio"), Sort.Order.asc("cpfCnpjHash"))));

        assertThat(p.getSort()).isEqualTo(Sort.by(Sort.Order.desc("municipio")));
    }
}
