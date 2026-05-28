package br.com.core4erp.empresa.service;

import br.com.core4erp.empresa.dto.PerfilAcessoRequestDto;
import br.com.core4erp.empresa.dto.PerfilAcessoResponseDto;
import br.com.core4erp.empresa.dto.PermissaoResponseDto;
import br.com.core4erp.empresa.entity.PerfilAcesso;
import br.com.core4erp.empresa.entity.Permissao;
import br.com.core4erp.empresa.repository.PerfilAcessoRepository;
import br.com.core4erp.empresa.repository.PermissaoRepository;
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

    private static final Set<String> PROTEGIDOS = Set.of("PROPRIETARIO", "ADMIN", "FINANCEIRO", "OPERADOR", "VISUALIZADOR");

    private final PerfilAcessoRepository perfilAcessoRepository;
    private final PermissaoRepository permissaoRepository;

    @Transactional(readOnly = true)
    public List<PerfilAcessoResponseDto> listar() {
        return perfilAcessoRepository.findAll().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PermissaoResponseDto> listarPermissoes() {
        return permissaoRepository.findAll().stream()
                .map(p -> new PermissaoResponseDto(p.getId(), p.getCodigo(), p.getModulo(), p.getAcao(), p.getDescricao()))
                .toList();
    }

    @Transactional
    public PerfilAcessoResponseDto criar(PerfilAcessoRequestDto dto) {
        String nome = dto.nome().toUpperCase();
        if (perfilAcessoRepository.findByNome(nome).isPresent()) {
            throw new IllegalArgumentException("Já existe um perfil com o nome: " + nome);
        }
        PerfilAcesso perfil = new PerfilAcesso();
        perfil.setNome(nome);
        perfil.setDescricao(dto.descricao());
        perfil.setPermissoes(resolverPermissoes(dto.permissaoIds()));
        return toDto(perfilAcessoRepository.save(perfil));
    }

    @Transactional
    public PerfilAcessoResponseDto atualizar(Long id, PerfilAcessoRequestDto dto) {
        PerfilAcesso perfil = perfilAcessoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Perfil não encontrado"));
        if (PROTEGIDOS.contains(perfil.getNome())) {
            throw new IllegalStateException("Perfil do sistema não pode ser alterado");
        }
        perfil.setNome(dto.nome().toUpperCase());
        perfil.setDescricao(dto.descricao());
        perfil.setPermissoes(resolverPermissoes(dto.permissaoIds()));
        return toDto(perfilAcessoRepository.save(perfil));
    }

    @Transactional
    public void deletar(Long id) {
        PerfilAcesso perfil = perfilAcessoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Perfil não encontrado"));
        if (PROTEGIDOS.contains(perfil.getNome())) {
            throw new IllegalStateException("Perfil do sistema não pode ser removido");
        }
        perfilAcessoRepository.delete(perfil);
    }

    private Set<Permissao> resolverPermissoes(Set<Long> ids) {
        if (ids == null || ids.isEmpty()) return Set.of();
        return permissaoRepository.findAllById(ids).stream().collect(Collectors.toSet());
    }

    private PerfilAcessoResponseDto toDto(PerfilAcesso p) {
        Set<String> codigos = p.getPermissoes().stream()
                .map(Permissao::getCodigo)
                .collect(Collectors.toSet());
        return new PerfilAcessoResponseDto(p.getId(), p.getNome(), p.getDescricao(), codigos, PROTEGIDOS.contains(p.getNome()));
    }
}
