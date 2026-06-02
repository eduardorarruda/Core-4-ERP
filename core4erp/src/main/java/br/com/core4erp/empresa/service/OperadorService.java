package br.com.core4erp.empresa.service;

import br.com.core4erp.config.rbac.PermissaoCalculadora;
import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.empresa.dto.OperadorResponseDto;
import br.com.core4erp.empresa.entity.Permissao;
import br.com.core4erp.empresa.entity.UsuarioEmpresa;
import br.com.core4erp.empresa.repository.PerfilAcessoRepository;
import br.com.core4erp.empresa.repository.UsuarioEmpresaRepository;
import br.com.core4erp.exception.BusinessException;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OperadorService {

    private final UsuarioEmpresaRepository usuarioEmpresaRepository;
    private final PerfilAcessoRepository perfilAcessoRepository;
    private final PermissaoCalculadora calculadora;
    private final TenantContext tenantCtx;

    @Requer("USUARIO_VISUALIZAR")
    public Page<OperadorResponseDto> listar(Pageable pageable) {
        tenantCtx.exigirContaEmpresa();
        return usuarioEmpresaRepository
            .findByEmpresaId(tenantCtx.getEmpresaId(), pageable)
            .map(this::toDto);
    }

    @Requer("USUARIO_EDITAR")
    @Transactional
    public OperadorResponseDto alterarPerfil(Long usuarioId, Long perfilId) {
        UsuarioEmpresa ue = buscarMembro(usuarioId);
        if ("PROPRIETARIO".equals(ue.getPerfil().getNome())) {
            throw new BusinessException("OPERACAO_INVALIDA",
                "O perfil do proprietário não pode ser alterado");
        }
        var novoPerfil = perfilAcessoRepository.findById(perfilId)
            .orElseThrow(() -> new EntityNotFoundException("Perfil não encontrado"));
        if ("PROPRIETARIO".equals(novoPerfil.getNome())) {
            throw new BusinessException("OPERACAO_INVALIDA",
                "Não é possível promover outro usuário a Proprietário");
        }
        ue.setPerfil(novoPerfil);
        return toDto(usuarioEmpresaRepository.save(ue));
    }

    @Requer("USUARIO_REMOVER")
    @Transactional
    public void remover(Long usuarioId) {
        UsuarioEmpresa ue = buscarMembro(usuarioId);
        if ("PROPRIETARIO".equals(ue.getPerfil().getNome())) {
            throw new BusinessException("OPERACAO_INVALIDA",
                "O proprietário não pode ser removido da empresa");
        }
        ue.setAtivo(false);
        usuarioEmpresaRepository.save(ue);
    }

    @Requer("USUARIO_EDITAR")
    @Transactional
    public OperadorResponseDto reativar(Long usuarioId) {
        UsuarioEmpresa ue = usuarioEmpresaRepository
            .findByUsuarioIdAndEmpresaId(usuarioId, tenantCtx.getEmpresaId())
            .orElseThrow(() -> new EntityNotFoundException("Operador não encontrado nesta empresa"));
        if ("PROPRIETARIO".equals(ue.getPerfil().getNome())) {
            throw new BusinessException("OPERACAO_INVALIDA",
                "Operação não permitida para o proprietário");
        }
        ue.setAtivo(true);
        return toDto(usuarioEmpresaRepository.save(ue));
    }

    private UsuarioEmpresa buscarMembro(Long usuarioId) {
        return usuarioEmpresaRepository
            .findByUsuarioIdAndEmpresaIdAndAtivoTrue(usuarioId, tenantCtx.getEmpresaId())
            .orElseThrow(() -> new EntityNotFoundException("Operador não encontrado nesta empresa"));
    }

    private OperadorResponseDto toDto(UsuarioEmpresa ue) {
        Set<String> efetivas = calculadora.calcular(
            ue.getPerfil().getPermissoes().stream()
                .map(Permissao::getCodigo).collect(Collectors.toSet()),
            List.of()
        );
        return new OperadorResponseDto(
            ue.getUsuario().getId(),
            ue.getUsuario().getNome(),
            ue.getUsuario().getEmail(),
            ue.getPerfil().getNome(),
            efetivas,
            ue.getAtivo(),
            ue.getUsuario().getSenhaProvisoria(),
            ue.getDataIngresso()
        );
    }
}
