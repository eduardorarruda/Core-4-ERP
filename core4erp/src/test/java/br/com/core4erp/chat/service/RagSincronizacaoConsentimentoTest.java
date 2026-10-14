package br.com.core4erp.chat.service;

import br.com.core4erp.categoria.repository.CategoriaRepository;
import br.com.core4erp.chat.repository.RagSyncRepository;
import br.com.core4erp.conta.repository.ContaRepository;
import br.com.core4erp.empresa.repository.EmpresaRepository;
import br.com.core4erp.parceiro.repository.ParceiroRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.vectorstore.VectorStore;

import java.time.YearMonth;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** RAG só processa (envia à OpenAI) empresas com consentimento; as demais têm os vetores apagados. */
class RagSincronizacaoConsentimentoTest {

    private VectorStore vectorStore;
    private RagSyncRepository ragSyncRepository;
    private EmpresaRepository empresaRepository;
    private RagSincronizacaoService self;
    private RagSincronizacaoService service;

    @BeforeEach
    void setUp() {
        vectorStore = mock(VectorStore.class);
        ragSyncRepository = mock(RagSyncRepository.class);
        empresaRepository = mock(EmpresaRepository.class);
        self = mock(RagSincronizacaoService.class); // proxy dos métodos @Transactional por empresa
        service = new RagSincronizacaoService(vectorStore, ragSyncRepository, empresaRepository,
                mock(ContaRepository.class), mock(CategoriaRepository.class), mock(ParceiroRepository.class), self);
        when(ragSyncRepository.existsByEmpresaIdAndTipoResumo(anyLong(), anyString())).thenReturn(true);
    }

    @Test
    void sincronizarTodas_soEmpresasComConsentimento_demaisTemVetoresApagados() {
        when(empresaRepository.findIdsAtivas()).thenReturn(List.of(1L, 2L, 3L));
        when(ragSyncRepository.findEmpresaIdsComConsentimento()).thenReturn(Set.of(1L, 3L));

        service.sincronizarTodas();

        verify(self).sincronizarMes(1L, YearMonth.now().minusMonths(1));
        verify(self).sincronizarMes(3L, YearMonth.now().minusMonths(1));
        verify(self, never()).sincronizarMes(org.mockito.ArgumentMatchers.eq(2L), any());
        verify(self, never()).sincronizarPerfilParceiros(2L);
        verify(vectorStore).delete("empresaId == '2'");
        verify(ragSyncRepository).deleteByEmpresaId(2L);
        verify(vectorStore, never()).delete("empresaId == '1'");
    }

    @Test
    void sincronizarEmpresa_manualSemConsentimento_naoEnviaNadaEApagaVetores() {
        when(ragSyncRepository.empresaTemConsentimento(5L)).thenReturn(false);

        int gravados = service.sincronizarEmpresa(5L);

        assertEquals(0, gravados);
        verify(self, never()).sincronizarMes(anyLong(), any());
        verify(self, never()).sincronizarPerfilCategorias(anyLong());
        verify(vectorStore).delete("empresaId == '5'");
        verify(ragSyncRepository).deleteByEmpresaId(5L);
    }

    @Test
    void sincronizarEmpresa_comConsentimento_sincronizaNormalmente() {
        when(ragSyncRepository.empresaTemConsentimento(7L)).thenReturn(true);
        when(self.sincronizarMes(7L, YearMonth.now().minusMonths(1))).thenReturn(true);
        when(self.sincronizarPerfilCategorias(7L)).thenReturn(true);

        assertEquals(2, service.sincronizarEmpresa(7L));
        verify(vectorStore, never()).delete(anyString());
    }

    @Test
    void sincronizarTodas_falhaAoApagarUmaEmpresa_naoInterrompeAsDemais() {
        when(empresaRepository.findIdsAtivas()).thenReturn(List.of(2L, 4L));
        when(ragSyncRepository.findEmpresaIdsComConsentimento()).thenReturn(Set.of(4L));
        doThrow(new RuntimeException("qdrant fora")).when(vectorStore).delete("empresaId == '2'");

        service.sincronizarTodas();

        verify(self).sincronizarMes(4L, YearMonth.now().minusMonths(1));
    }
}
