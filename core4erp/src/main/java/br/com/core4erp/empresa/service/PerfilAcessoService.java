package br.com.core4erp.empresa.service;

import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.empresa.dto.PerfilAcessoRequestDto;
import br.com.core4erp.empresa.dto.PerfilAcessoResponseDto;
import br.com.core4erp.empresa.dto.PermissaoResponseDto;
import br.com.core4erp.empresa.entity.PerfilAcesso;
import br.com.core4erp.empresa.entity.Permissao;
import br.com.core4erp.empresa.repository.PerfilAcessoRepository;
import br.com.core4erp.empresa.repository.PermissaoRepository;
import br.com.core4erp.exception.AcessoNegadoException;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PerfilAcessoService {

    private final PerfilAcessoRepository perfilAcessoRepository;
    private final PermissaoRepository permissaoRepository;
    private final TenantContext tenantCtx;

    @Requer("USUARIO_VISUALIZAR")
    @Transactional(readOnly = true)
    public List<PerfilAcessoResponseDto> listar() {
        tenantCtx.exigirContaEmpresa();
        Long empresaId = tenantCtx.getEmpresaId();
        if (empresaId == null) {
            // adminSistema sem empresa selecionada — retorna todos
            return perfilAcessoRepository.findAll().stream().map(this::toDto).toList();
        }
        return perfilAcessoRepository.findAllGlobalOrByEmpresaId(empresaId)
                .stream().map(this::toDto).toList();
    }

    @Requer("CONFIGURACAO_EDITAR")
    @Transactional(readOnly = true)
    public List<PermissaoResponseDto> listarPermissoes() {
        return permissaoRepository.findAll().stream()
                .map(p -> new PermissaoResponseDto(p.getId(), p.getCodigo(), p.getModulo(), p.getAcao(), p.getDescricao()))
                .toList();
    }

    @Requer("CONFIGURACAO_EDITAR")
    @Transactional
    public PerfilAcessoResponseDto criar(PerfilAcessoRequestDto dto) {
        tenantCtx.exigirContaEmpresa();
        Long empresaId = tenantCtx.getEmpresaId();
        String nome = dto.nome().toUpperCase();

        if (dto.permissaoIds() == null || dto.permissaoIds().isEmpty()) {
            throw new IllegalArgumentException("É necessário selecionar pelo menos uma permissão para criar um perfil.");
        }

        if (perfilAcessoRepository.existsByNomeAndEmpresaIdIsNull(nome)
                || perfilAcessoRepository.existsByNomeAndEmpresaId(nome, empresaId)) {
            throw new IllegalArgumentException("Já existe um perfil com o nome: " + nome);
        }

        PerfilAcesso perfil = new PerfilAcesso();
        perfil.setNome(nome);
        perfil.setDescricao(dto.descricao());
        perfil.setEmpresaId(empresaId);
        perfil.setPermissoes(resolverPermissoes(dto.permissaoIds()));
        return toDto(perfilAcessoRepository.save(perfil));
    }

    @Requer("CONFIGURACAO_EDITAR")
    @Transactional
    public PerfilAcessoResponseDto atualizar(Long id, PerfilAcessoRequestDto dto) {
        tenantCtx.exigirContaEmpresa();
        PerfilAcesso perfil = perfilAcessoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Perfil não encontrado"));

        validarOwnership(perfil);

        perfil.setNome(dto.nome().toUpperCase());
        perfil.setDescricao(dto.descricao());
        perfil.setPermissoes(resolverPermissoes(dto.permissaoIds()));
        return toDto(perfilAcessoRepository.save(perfil));
    }

    @Requer("CONFIGURACAO_EDITAR")
    @Transactional
    public void deletar(Long id) {
        tenantCtx.exigirContaEmpresa();
        PerfilAcesso perfil = perfilAcessoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Perfil não encontrado"));

        validarOwnership(perfil);
        perfilAcessoRepository.delete(perfil);
    }

    // ---- privados ----

    private void validarOwnership(PerfilAcesso perfil) {
        if (perfil.getEmpresaId() == null) {
            throw new IllegalStateException("Perfil do sistema não pode ser alterado");
        }
        if (!perfil.getEmpresaId().equals(tenantCtx.getEmpresaId())) {
            throw new AcessoNegadoException("Acesso negado ao perfil");
        }
    }

    private Set<Permissao> resolverPermissoes(Set<Long> ids) {
        if (ids == null || ids.isEmpty()) return Set.of();
        return permissaoRepository.findAllById(ids).stream().collect(Collectors.toSet());
    }

    private PerfilAcessoResponseDto toDto(PerfilAcesso p) {
        Set<String> codigos = p.getPermissoes().stream()
                .map(Permissao::getCodigo)
                .collect(Collectors.toSet());
        boolean protegido = p.getEmpresaId() == null;
        return new PerfilAcessoResponseDto(p.getId(), p.getNome(), p.getDescricao(), codigos, protegido);
    }
}
