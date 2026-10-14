package br.com.core4erp.parceiro.repository;

import br.com.core4erp.config.crypto.CryptoTestKeys;
import br.com.core4erp.config.crypto.IndiceCego;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** As buscas por CPF/CNPJ usam SEMPRE o índice cego (o valor no banco é cifrado). */
class ParceiroRepositoryIndiceTest {

    private ParceiroRepository repo;

    @BeforeEach
    void setUp() {
        CryptoTestKeys.inicializar();
        repo = mock(ParceiroRepository.class, CALLS_REAL_METHODS);
    }

    @Test
    void existeDocumento_consultaPeloHashDoDocumentoNormalizado() {
        when(repo.existsByCpfCnpjHashAndEmpresaId(anyString(), anyLong())).thenReturn(true);
        repo.existeDocumento("529.982.247-25", 7L);
        verify(repo).existsByCpfCnpjHashAndEmpresaId(IndiceCego.documento("52998224725"), 7L);
    }

    @Test
    void existeDocumento_semDocumento_naoConsulta() {
        assertFalse(repo.existeDocumento(null, 7L));
        verify(repo, never()).existsByCpfCnpjHashAndEmpresaId(any(), any());
    }

    @Test
    void buscar_termoTextual_usaSentinelaNaoNula() {
        when(repo.buscarPorNomeOuDocumento(anyLong(), anyString(), anyString(), any())).thenReturn(List.of());
        repo.buscar(7L, "Padaria", PageRequest.of(0, 5));
        verify(repo).buscarPorNomeOuDocumento(eq(7L), eq("Padaria"), eq(ParceiroRepository.SEM_DOCUMENTO), any());
    }

    @Test
    void buscar_termoDocumento_usaIndiceCego() {
        when(repo.buscarPorNomeOuDocumento(anyLong(), anyString(), anyString(), any())).thenReturn(List.of());
        repo.buscar(7L, "11.222.333/0001-81", PageRequest.of(0, 5));
        verify(repo).buscarPorNomeOuDocumento(eq(7L), eq("11.222.333/0001-81"),
                eq(IndiceCego.documento("11222333000181")), any());
    }
}
