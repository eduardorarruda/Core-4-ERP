package br.com.core4erp.empresa.service;

import br.com.core4erp.config.rbac.EscaladaPrivilegioValidator;
import br.com.core4erp.config.rbac.PermissaoCalculadora;
import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.config.security.EventoSeguranca;
import br.com.core4erp.config.tenant.PermissaoCacheService;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.empresa.dto.OperadorResponseDto;
import br.com.core4erp.empresa.entity.Permissao;
import br.com.core4erp.empresa.entity.UsuarioEmpresa;
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
    private final PermissaoCalculadora calculadora;
    private final TenantContext tenantCtx;
    private final PerfilAtribuicaoService perfilAtribuicaoService;
    private final PermissaoCacheService permissaoCacheService;

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
        perfilAtribuicaoService.bloquearAutoAlteracao(usuarioId);
        UsuarioEmpresa ue = buscarMembro(usuarioId);
        validarNaoEhProprietario(ue, "O perfil do proprietário não pode ser alterado");
        var novoPerfil = perfilAtribuicaoService.resolverParaAtribuir(perfilId);
        String perfilAnterior = ue.getPerfil().getNome();

        invalidarCache(ue);
        ue.setPerfil(novoPerfil);
        OperadorResponseDto dto = toDto(usuarioEmpresaRepository.save(ue));
        EventoSeguranca.info(EventoSeguranca.PERFIL_ALTERADO)
            .addKeyValue("usuarioId", tenantCtx.getUsuarioId())
            .addKeyValue("empresaId", tenantCtx.getEmpresaId())
            .addKeyValue("alvoUsuarioId", usuarioId)
            .addKeyValue("perfilAnterior", perfilAnterior)
            .addKeyValue("perfilNovo", novoPerfil.getNome())
            .log("Perfil de acesso de membro alterado");
        return dto;
    }

    @Requer("USUARIO_REMOVER")
    @Transactional
    public void remover(Long usuarioId) {
        perfilAtribuicaoService.bloquearAutoAlteracao(usuarioId);
        UsuarioEmpresa ue = buscarMembro(usuarioId);
        validarNaoEhProprietario(ue, "O proprietário não pode ser removido da empresa");
        invalidarCache(ue);
        ue.setAtivo(false);
        usuarioEmpresaRepository.save(ue);
        EventoSeguranca.info(EventoSeguranca.MEMBRO_REMOVIDO)
            .addKeyValue("usuarioId", tenantCtx.getUsuarioId())
            .addKeyValue("empresaId", tenantCtx.getEmpresaId())
            .addKeyValue("alvoUsuarioId", usuarioId)
            .log("Membro removido da empresa");
    }

    @Requer("USUARIO_EDITAR")
    @Transactional
    public OperadorResponseDto reativar(Long usuarioId) {
        perfilAtribuicaoService.bloquearAutoAlteracao(usuarioId);
        UsuarioEmpresa ue = usuarioEmpresaRepository
            .findByUsuarioIdAndEmpresaId(usuarioId, tenantCtx.getEmpresaId())
            .orElseThrow(() -> new EntityNotFoundException("Operador não encontrado nesta empresa"));
        validarNaoEhProprietario(ue, "Operação não permitida para o proprietário");
        invalidarCache(ue);
        ue.setAtivo(true);
        OperadorResponseDto dto = toDto(usuarioEmpresaRepository.save(ue));
        EventoSeguranca.info(EventoSeguranca.MEMBRO_REATIVADO)
            .addKeyValue("usuarioId", tenantCtx.getUsuarioId())
            .addKeyValue("empresaId", tenantCtx.getEmpresaId())
            .addKeyValue("alvoUsuarioId", usuarioId)
            .log("Membro reativado na empresa");
        return dto;
    }

    private static void validarNaoEhProprietario(UsuarioEmpresa ue, String mensagem) {
        if (EscaladaPrivilegioValidator.ehPerfilProprietario(ue.getPerfil())
                || EscaladaPrivilegioValidator.PERFIL_PROPRIETARIO.equals(ue.getPerfil().getNome())) {
            throw new BusinessException("OPERACAO_INVALIDA", mensagem);
        }
    }

    // Invalidar ANTES de persistir (e de novo após o commit — ver PermissaoCacheService)
    private void invalidarCache(UsuarioEmpresa ue) {
        permissaoCacheService.invalidar(ue.getUsuario().getEmail(), tenantCtx.getEmpresaId());
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
