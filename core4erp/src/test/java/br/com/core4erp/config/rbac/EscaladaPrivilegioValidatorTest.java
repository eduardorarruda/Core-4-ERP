package br.com.core4erp.config.rbac;

import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.empresa.entity.PerfilAcesso;
import br.com.core4erp.empresa.entity.UsuarioEmpresa;
import br.com.core4erp.empresa.repository.UsuarioEmpresaRepository;
import br.com.core4erp.exception.AcessoNegadoException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class EscaladaPrivilegioValidatorTest {

    private final TenantContext ctx = new TenantContext();
    private final UsuarioEmpresaRepository ueRepo = mock(UsuarioEmpresaRepository.class);
    private final EscaladaPrivilegioValidator validator = new EscaladaPrivilegioValidator(ctx, ueRepo);

    static PerfilAcesso perfil(String nome, Long empresaId) {
        PerfilAcesso p = new PerfilAcesso();
        p.setNome(nome);
        p.setEmpresaId(empresaId);
        return p;
    }

    private void vinculo(PerfilAcesso perfil) {
        UsuarioEmpresa ue = new UsuarioEmpresa();
        ue.setPerfil(perfil);
        when(ueRepo.findByUsuarioIdAndEmpresaIdAndAtivoTrue(1L, 10L)).thenReturn(Optional.of(ue));
    }

    @BeforeEach
    void contexto() {
        ctx.setUsuarioId(1L);
        ctx.setEmpresaId(10L);
        ctx.setPermissoes(Set.of("CONTA_VISUALIZAR", "USUARIO_EDITAR"));
    }

    @AfterEach
    void limpar() {
        ctx.clear();
    }

    @Test
    void concederPermissaoQueNaoPossui_negado() {
        vinculo(perfil("ADMIN", null));
        assertThatThrownBy(() -> validator.validarCodigos(List.of("CONTA_VISUALIZAR", "CONTA_DELETAR")))
                .isInstanceOf(AcessoNegadoException.class);
    }

    @Test
    void concederSubconjuntoDasProprias_permitido() {
        assertThatCode(() -> validator.validarCodigos(List.of("CONTA_VISUALIZAR"))).doesNotThrowAnyException();
    }

    @Test
    void proprietarioDoSistema_podeConcederQualquer() {
        vinculo(perfil("PROPRIETARIO", null));
        assertThatCode(() -> validator.validarCodigos(List.of("CONFIGURACAO_EDITAR"))).doesNotThrowAnyException();
    }

    @Test
    void perfilCustomizadoRenomeadoParaProprietario_naoTemBypass() {
        vinculo(perfil("PROPRIETARIO", 10L));
        assertThatThrownBy(() -> validator.validarCodigos(List.of("CONFIGURACAO_EDITAR")))
                .isInstanceOf(AcessoNegadoException.class);
    }

    @Test
    void adminSistema_podeConcederQualquer() {
        ctx.setAdminSistema(true);
        assertThatCode(() -> validator.validarCodigos(List.of("CONFIGURACAO_EDITAR"))).doesNotThrowAnyException();
    }
}
