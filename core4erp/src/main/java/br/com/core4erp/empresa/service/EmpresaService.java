package br.com.core4erp.empresa.service;

import br.com.core4erp.config.rbac.PermissaoCalculadora;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.empresa.dto.*;
import br.com.core4erp.empresa.entity.*;
import br.com.core4erp.empresa.repository.*;
import br.com.core4erp.exception.AcessoNegadoException;
import br.com.core4erp.exception.BusinessException;
import br.com.core4erp.usuario.entity.Usuario;
import br.com.core4erp.usuario.repository.UsuarioRepository;
import com.github.benmanes.caffeine.cache.Cache;
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
public class EmpresaService {

    private final EmpresaRepository empresaRepository;
    private final UsuarioEmpresaRepository usuarioEmpresaRepository;
    private final UsuarioEmpresaPermissaoRepository permissaoUsuarioRepository;
    private final PerfilAcessoRepository perfilAcessoRepository;
    private final UsuarioRepository usuarioRepository;
    private final PermissaoCalculadora permissaoCalculadora;
    private final TenantContext tenantCtx;
    private final Cache<String, Set<String>> permissaoCache;

    public List<EmpresaResumoDto> minhas(String email) {
        return usuarioEmpresaRepository.findByUsuario_EmailAndAtivoTrue(email)
            .stream()
            .map(ue -> {
                Set<String> doPerfil = ue.getPerfil().getPermissoes()
                    .stream().map(Permissao::getCodigo).collect(Collectors.toSet());
                var diretas = permissaoUsuarioRepository
                    .findByUsuarioIdAndEmpresaId(ue.getUsuario().getId(), ue.getEmpresa().getId());
                Set<String> efetivas = permissaoCalculadora.calcular(doPerfil, diretas);
                return new EmpresaResumoDto(
                    ue.getEmpresa().getId(),
                    ue.getEmpresa().getNome(),
                    ue.getPerfil().getNome(),
                    efetivas
                );
            })
            .toList();
    }

    public EmpresaResponseDto buscar(Long id) {
        validarAcesso(id);
        return EmpresaResponseDto.from(findById(id));
    }

    @Transactional
    public EmpresaResponseDto criar(EmpresaRequestDto dto, Long usuarioId) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
            .orElseThrow(() -> new EntityNotFoundException("Usuário não encontrado"));

        Empresa empresa = new Empresa();
        empresa.setNome(dto.nome());
        empresa.setCnpj(dto.cnpj());
        empresa.setEmailContato(dto.emailContato());
        empresa.setTelefone(dto.telefone());
        if (dto.plano() != null) empresa.setPlano(dto.plano());

        empresa = empresaRepository.save(empresa);

        PerfilAcesso proprietario = perfilAcessoRepository.findByNome("PROPRIETARIO")
            .orElseThrow(() -> new IllegalStateException("Perfil PROPRIETARIO não encontrado"));

        UsuarioEmpresa ue = new UsuarioEmpresa();
        ue.setUsuario(usuario);
        ue.setEmpresa(empresa);
        ue.setPerfil(proprietario);
        usuarioEmpresaRepository.save(ue);

        return EmpresaResponseDto.from(empresa);
    }

    @Transactional
    public EmpresaResponseDto atualizar(Long id, EmpresaRequestDto dto) {
        validarAcesso(id);
        Empresa empresa = findById(id);
        empresa.setNome(dto.nome());
        if (dto.cnpj() != null) empresa.setCnpj(dto.cnpj());
        if (dto.emailContato() != null) empresa.setEmailContato(dto.emailContato());
        if (dto.telefone() != null) empresa.setTelefone(dto.telefone());
        if (dto.plano() != null) empresa.setPlano(dto.plano());
        return EmpresaResponseDto.from(empresaRepository.save(empresa));
    }

    // Gestão de membros

    public Page<MembroResponseDto> listarMembros(Pageable pageable) {
        return usuarioEmpresaRepository.findByEmpresaIdAndAtivoTrue(tenantCtx.getEmpresaId(), pageable)
            .map(MembroResponseDto::from);
    }

    @Transactional
    public MembroResponseDto convidarMembro(ConvidarMembroRequestDto dto) {
        PerfilAcesso perfil = perfilAcessoRepository.findById(dto.perfilId())
            .orElseThrow(() -> new EntityNotFoundException("Perfil não encontrado"));

        Usuario usuario = findUsuarioByEmail(dto.email());

        if (usuarioEmpresaRepository.existsByUsuarioIdAndEmpresaId(
                usuario.getId(), tenantCtx.getEmpresaId())) {
            throw new BusinessException("MEMBRO_EXISTENTE", "Usuário já é membro desta empresa");
        }
        Usuario convidadoPor = usuarioRepository.getReferenceById(tenantCtx.getUsuarioId());

        UsuarioEmpresa ue = new UsuarioEmpresa();
        ue.setUsuario(usuario);
        ue.setEmpresa(findById(tenantCtx.getEmpresaId()));
        ue.setPerfil(perfil);
        ue.setConvidadoPor(convidadoPor);
        return MembroResponseDto.from(usuarioEmpresaRepository.save(ue));
    }

    @Transactional
    public MembroResponseDto alterarPerfil(Long usuarioId, AlterarPerfilRequestDto dto) {
        UsuarioEmpresa ue = buscarMembro(usuarioId);
        validarNaoEhProprietario(ue);

        PerfilAcesso novoPerfil = perfilAcessoRepository.findById(dto.perfilId())
            .orElseThrow(() -> new EntityNotFoundException("Perfil não encontrado"));
        ue.setPerfil(novoPerfil);

        invalidarCache(ue.getUsuario().getEmail());
        return MembroResponseDto.from(usuarioEmpresaRepository.save(ue));
    }

    @Transactional
    public void removerMembro(Long usuarioId) {
        UsuarioEmpresa ue = buscarMembro(usuarioId);
        validarNaoEhProprietario(ue);
        ue.setAtivo(false);
        usuarioEmpresaRepository.save(ue);
        invalidarCache(ue.getUsuario().getEmail());
    }

    // Helpers

    private Empresa findById(Long id) {
        return empresaRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Empresa não encontrada"));
    }

    private Usuario findUsuarioByEmail(String email) {
        return usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new EntityNotFoundException("Usuário não encontrado: " + email));
    }

    private UsuarioEmpresa buscarMembro(Long usuarioId) {
        return usuarioEmpresaRepository
            .findByUsuarioIdAndEmpresaIdAndAtivoTrue(usuarioId, tenantCtx.getEmpresaId())
            .orElseThrow(() -> new EntityNotFoundException("Usuário não é membro ativo desta empresa"));
    }

    private void validarNaoEhProprietario(UsuarioEmpresa ue) {
        if ("PROPRIETARIO".equals(ue.getPerfil().getNome())) {
            throw new BusinessException("OPERACAO_INVALIDA", "Não é possível alterar o proprietário da empresa");
        }
    }

    private void validarAcesso(Long empresaId) {
        boolean temAcesso = usuarioEmpresaRepository
            .findByUsuarioIdAndEmpresaIdAndAtivoTrue(tenantCtx.getUsuarioId(), empresaId)
            .isPresent();
        if (!temAcesso) {
            throw new AcessoNegadoException("Acesso negado à empresa " + empresaId);
        }
    }

    private void invalidarCache(String email) {
        permissaoCache.invalidate(email + ":" + tenantCtx.getEmpresaId());
    }
}
