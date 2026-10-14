package br.com.core4erp.empresa.service;

import br.com.core4erp.config.rbac.EscaladaPrivilegioValidator;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.empresa.entity.PerfilAcesso;
import br.com.core4erp.empresa.repository.PerfilAcessoRepository;
import br.com.core4erp.exception.BusinessException;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Regras comuns a TODA atribuição de perfil a um usuário (alterar perfil de membro, convite,
 * adicionar membro):
 * <ol>
 *   <li>o perfil precisa ser do sistema ou da própria empresa ativa (nunca de outra empresa);</li>
 *   <li>PROPRIETARIO não é atribuível;</li>
 *   <li>o perfil não pode ter permissões que quem atribui não possui (salvo PROPRIETARIO/admin);</li>
 *   <li>ninguém altera o próprio perfil nem as próprias permissões diretas.</li>
 * </ol>
 */
@Service
public class PerfilAtribuicaoService {

    private final PerfilAcessoRepository perfilAcessoRepository;
    private final EscaladaPrivilegioValidator escaladaValidator;
    private final TenantContext tenantCtx;

    public PerfilAtribuicaoService(PerfilAcessoRepository perfilAcessoRepository,
                                   EscaladaPrivilegioValidator escaladaValidator,
                                   TenantContext tenantCtx) {
        this.perfilAcessoRepository = perfilAcessoRepository;
        this.escaladaValidator = escaladaValidator;
        this.tenantCtx = tenantCtx;
    }

    /** Carrega e valida o perfil que será atribuído na empresa ativa. */
    public PerfilAcesso resolverParaAtribuir(Long perfilId) {
        PerfilAcesso perfil = perfilAcessoRepository.findAtribuivelNaEmpresa(perfilId, tenantCtx.getEmpresaId())
                .orElseThrow(() -> new EntityNotFoundException("Perfil não encontrado."));
        if (EscaladaPrivilegioValidator.PERFIL_PROPRIETARIO.equals(perfil.getNome())) {
            throw new BusinessException("OPERACAO_INVALIDA",
                    "Não é possível atribuir o perfil de Proprietário a outro usuário.");
        }
        escaladaValidator.validarPerfil(perfil);
        return perfil;
    }

    /** Bloqueia que o usuário altere o próprio perfil/vínculo/permissões diretas (auto-promoção). */
    public void bloquearAutoAlteracao(Long usuarioIdAlvo) {
        if (usuarioIdAlvo != null && usuarioIdAlvo.equals(tenantCtx.getUsuarioId())) {
            throw new BusinessException("OPERACAO_INVALIDA",
                    "Você não pode alterar o seu próprio perfil de acesso nem as suas permissões. "
                            + "Peça a outro administrador.");
        }
    }
}
