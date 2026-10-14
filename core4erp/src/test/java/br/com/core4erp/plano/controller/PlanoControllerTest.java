package br.com.core4erp.plano.controller;

import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.exception.AcessoNegadoException;
import br.com.core4erp.plano.service.PlanoService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class PlanoControllerTest {

    private final PlanoService planoService = mock(PlanoService.class);
    private final TenantContext ctx = new TenantContext();
    private final PlanoController controller = new PlanoController(planoService, ctx);

    @AfterEach
    void limpar() {
        ctx.clear();
    }

    @Test
    void naoAdmin_bloqueadoNoController_antesDoService() {
        ctx.setEmpresaId(1L);
        assertThatThrownBy(controller::listarTodos).isInstanceOf(AcessoNegadoException.class);
        assertThatThrownBy(() -> controller.desativar(1L)).isInstanceOf(AcessoNegadoException.class);
        assertThatThrownBy(() -> controller.reativar(1L)).isInstanceOf(AcessoNegadoException.class);
        verifyNoInteractions(planoService);
    }

    @Test
    void adminSistema_acessa() {
        ctx.setAdminSistema(true);
        when(planoService.listarTodos()).thenReturn(List.of());
        controller.listarTodos();
        verify(planoService).listarTodos();
    }
}
