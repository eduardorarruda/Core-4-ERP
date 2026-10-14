package br.com.core4erp.config.rbac;

import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.exception.AcessoNegadoException;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.Signature;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.lang.annotation.Annotation;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PermissaoAspectTest {

    private final TenantContext ctx = new TenantContext();
    private final PermissaoAspect aspect = new PermissaoAspect(ctx);

    private static Requer requer(String codigo) {
        return new Requer() {
            @Override public String value() { return codigo; }
            @Override public Class<? extends Annotation> annotationType() { return Requer.class; }
        };
    }

    private static JoinPoint jp() {
        JoinPoint jp = mock(JoinPoint.class);
        Signature sig = mock(Signature.class);
        when(sig.toShortString()).thenReturn("Servico.metodo()");
        when(jp.getSignature()).thenReturn(sig);
        return jp;
    }

    @AfterEach
    void limpar() {
        ctx.clear();
    }

    @Test
    void semContexto_negado() {
        assertThatThrownBy(() -> aspect.verificarPermissao(jp(), requer("CONTA_VISUALIZAR")))
                .isInstanceOf(AcessoNegadoException.class);
    }

    @Test
    void semAPermissao_negado() {
        ctx.setEmpresaId(1L);
        ctx.setPermissoes(Set.of("CONTA_VISUALIZAR"));
        assertThatThrownBy(() -> aspect.verificarPermissao(jp(), requer("CARTAO_VISUALIZAR")))
                .isInstanceOf(AcessoNegadoException.class);
    }

    @Test
    void comAPermissao_permitido() {
        ctx.setEmpresaId(1L);
        ctx.setPermissoes(Set.of("CARTAO_VISUALIZAR"));
        assertThatCode(() -> aspect.verificarPermissao(jp(), requer("CARTAO_VISUALIZAR"))).doesNotThrowAnyException();
    }
}
