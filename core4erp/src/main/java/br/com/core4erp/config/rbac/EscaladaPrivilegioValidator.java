package br.com.core4erp.config.rbac;

import br.com.core4erp.config.security.EventoSeguranca;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.empresa.entity.PerfilAcesso;
import br.com.core4erp.empresa.entity.Permissao;
import br.com.core4erp.empresa.repository.UsuarioEmpresaRepository;
import br.com.core4erp.exception.AcessoNegadoException;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.List;
import java.util.Set;

/**
 * Regra ÚNICA contra escalada de privilégio: quem concede permissões (diretamente, via perfil
 * customizado ou atribuindo um perfil a alguém) só pode conceder o que ele mesmo possui.
 *
 * <p>Exceções — podem conceder qualquer permissão do catálogo:
 * <ul>
 *   <li>Admin do Sistema;</li>
 *   <li>PROPRIETARIO da empresa ativa — modelado como vínculo ativo com o perfil de SISTEMA
 *       ({@code empresa_id IS NULL}) de nome {@value #PERFIL_PROPRIETARIO}. A verificação é feita no
 *       banco (não pelo nome no TenantContext) para que um perfil customizado renomeado para
 *       "PROPRIETARIO" nunca herde o privilégio.</li>
 * </ul>
 */
@Component
public class EscaladaPrivilegioValidator {

    public static final String PERFIL_PROPRIETARIO = "PROPRIETARIO";
    static final String MENSAGEM = "Você não pode conceder acessos que você mesmo não possui.";

    private final TenantContext tenantCtx;
    private final UsuarioEmpresaRepository usuarioEmpresaRepository;

    public EscaladaPrivilegioValidator(TenantContext tenantCtx, UsuarioEmpresaRepository usuarioEmpresaRepository) {
        this.tenantCtx = tenantCtx;
        this.usuarioEmpresaRepository = usuarioEmpresaRepository;
    }

    /** {@code true} se o usuário atual pode conceder qualquer permissão do catálogo. */
    public boolean podeConcederQualquer() {
        if (tenantCtx.isAdminSistema()) return true;
        Long usuarioId = tenantCtx.getUsuarioId();
        Long empresaId = tenantCtx.getEmpresaId();
        if (usuarioId == null || empresaId == null) return false;
        return usuarioEmpresaRepository.findByUsuarioIdAndEmpresaIdAndAtivoTrue(usuarioId, empresaId)
                .map(ue -> ehPerfilProprietario(ue.getPerfil()))
                .orElse(false);
    }

    public static boolean ehPerfilProprietario(PerfilAcesso perfil) {
        return perfil != null && perfil.getEmpresaId() == null && PERFIL_PROPRIETARIO.equals(perfil.getNome());
    }

    /** Exige que todos os códigos estejam entre as permissões efetivas do usuário atual. */
    public void validarCodigos(Collection<String> codigos) {
        if (codigos == null || codigos.isEmpty()) return;
        Set<String> minhas = tenantCtx.getPermissoes();
        List<String> excedentes = codigos.stream().filter(c -> !minhas.contains(c)).sorted().toList();
        if (excedentes.isEmpty() || podeConcederQualquer()) return;

        // CR-B8: log interno específico, mensagem externa genérica
        EventoSeguranca.warn(EventoSeguranca.ESCALADA_PRIVILEGIO_NEGADA)
                .addKeyValue("usuarioId", tenantCtx.getUsuarioId())
                .addKeyValue("empresaId", tenantCtx.getEmpresaId())
                .addKeyValue("permissoes", String.join(",", excedentes))
                .log("Escalada de privilégio negada");
        throw new AcessoNegadoException(MENSAGEM);
    }

    public void validarPermissoes(Collection<Permissao> permissoes) {
        if (permissoes == null) return;
        validarCodigos(permissoes.stream().map(Permissao::getCodigo).toList());
    }

    /** O perfil que será atribuído a alguém não pode exceder as permissões de quem atribui. */
    public void validarPerfil(PerfilAcesso perfil) {
        validarPermissoes(perfil.getPermissoes());
    }
}
