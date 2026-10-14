package br.com.core4erp.empresa.service;

import br.com.core4erp.config.rbac.EscaladaPrivilegioValidator;
import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.config.security.EventoSeguranca;
import br.com.core4erp.config.tenant.PermissaoCacheService;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.empresa.dto.PerfilAcessoRequestDto;
import br.com.core4erp.empresa.dto.PerfilAcessoResponseDto;
import br.com.core4erp.empresa.dto.PermissaoResponseDto;
import br.com.core4erp.empresa.entity.PerfilAcesso;
import br.com.core4erp.empresa.entity.Permissao;
import br.com.core4erp.empresa.repository.ConviteRepository;
import br.com.core4erp.empresa.repository.PerfilAcessoRepository;
import br.com.core4erp.empresa.repository.PermissaoRepository;
import br.com.core4erp.empresa.repository.UsuarioEmpresaRepository;
import br.com.core4erp.exception.AcessoNegadoException;
import br.com.core4erp.exception.BusinessException;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PerfilAcessoService {

    private final PerfilAcessoRepository perfilAcessoRepository;
    private final PermissaoRepository permissaoRepository;
    private final TenantContext tenantCtx;
    private final EscaladaPrivilegioValidator escaladaValidator;
    private final PermissaoCacheService permissaoCacheService;
    private final UsuarioEmpresaRepository usuarioEmpresaRepository;
    private final ConviteRepository conviteRepository;

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
        String nome = normalizarNome(dto.nome());

        if (dto.permissaoIds() == null || dto.permissaoIds().isEmpty()) {
            throw new IllegalArgumentException("É necessário selecionar pelo menos uma permissão para criar um perfil.");
        }
        validarNomeDisponivel(nome, empresaId, null);

        Set<Permissao> permissoes = resolverPermissoes(dto.permissaoIds());
        // Escalada de privilégio: só concede o que o próprio usuário tem (PROPRIETARIO/admin: tudo)
        escaladaValidator.validarPermissoes(permissoes);

        PerfilAcesso perfil = new PerfilAcesso();
        perfil.setNome(nome);
        perfil.setDescricao(dto.descricao());
        perfil.setEmpresaId(empresaId);
        perfil.setPermissoes(permissoes);
        PerfilAcessoResponseDto salvo = toDto(perfilAcessoRepository.save(perfil));
        registrarEvento("criado", salvo.id(), nome);
        return salvo;
    }

    @Requer("CONFIGURACAO_EDITAR")
    @Transactional
    public PerfilAcessoResponseDto atualizar(Long id, PerfilAcessoRequestDto dto) {
        tenantCtx.exigirContaEmpresa();
        PerfilAcesso perfil = perfilAcessoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Perfil não encontrado"));

        validarOwnership(perfil);
        String nome = normalizarNome(dto.nome());
        validarNomeDisponivel(nome, perfil.getEmpresaId(), perfil.getId());

        Set<Permissao> novas = resolverPermissoes(dto.permissaoIds());
        // Só as permissões ACRESCENTADAS precisam passar pela regra de escalada — remover ou manter
        // o que já existia (ex.: definido pelo proprietário) não concede nada novo.
        Set<Long> atuais = perfil.getPermissoes().stream().map(Permissao::getId).collect(Collectors.toSet());
        escaladaValidator.validarPermissoes(novas.stream().filter(p -> !atuais.contains(p.getId())).toList());

        // Mudança no perfil afeta todos os membros que o usam — invalida antes de persistir
        permissaoCacheService.invalidarTodos();
        perfil.setNome(nome);
        perfil.setDescricao(dto.descricao());
        perfil.setPermissoes(novas);
        PerfilAcessoResponseDto salvo = toDto(perfilAcessoRepository.save(perfil));
        registrarEvento("atualizado", id, nome);
        return salvo;
    }

    @Requer("CONFIGURACAO_EDITAR")
    @Transactional
    public void deletar(Long id) {
        tenantCtx.exigirContaEmpresa();
        PerfilAcesso perfil = perfilAcessoRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Perfil não encontrado"));

        validarOwnership(perfil);
        if (usuarioEmpresaRepository.existsByPerfilId(id) || conviteRepository.existsByPerfilIdAndAceitoFalse(id)) {
            throw new BusinessException("REGISTRO_EM_USO",
                    "Não é possível excluir este perfil porque ele está atribuído a usuários ou a convites "
                            + "pendentes. Altere o perfil dessas pessoas antes de excluí-lo.");
        }
        perfilAcessoRepository.delete(perfil);
        registrarEvento("excluido", id, perfil.getNome());
    }

    // ---- privados ----

    private static String normalizarNome(String nome) {
        return nome == null ? "" : nome.trim().toUpperCase(Locale.ROOT);
    }

    /**
     * Nomes de perfis do sistema (PROPRIETARIO, ADMIN, ...) são reservados e o nome é único por
     * empresa — vale para criar E renomear (antes o atualizar permitia renomear para PROPRIETARIO).
     */
    private void validarNomeDisponivel(String nome, Long empresaId, Long idAtual) {
        if (perfilAcessoRepository.existsByNomeAndEmpresaIdIsNull(nome)) {
            throw new IllegalArgumentException("O nome " + nome + " é reservado para um perfil do sistema. Escolha outro nome.");
        }
        boolean duplicado = idAtual == null
                ? perfilAcessoRepository.existsByNomeAndEmpresaId(nome, empresaId)
                : perfilAcessoRepository.existsByNomeAndEmpresaIdAndIdNot(nome, empresaId, idAtual);
        if (duplicado) {
            throw new IllegalArgumentException("Já existe um perfil com o nome: " + nome);
        }
    }

    private void validarOwnership(PerfilAcesso perfil) {
        if (perfil.getEmpresaId() == null) {
            throw new IllegalStateException("Perfil do sistema não pode ser alterado");
        }
        if (!perfil.getEmpresaId().equals(tenantCtx.getEmpresaId())) {
            throw new AcessoNegadoException("Acesso negado ao perfil");
        }
    }

    private Set<Permissao> resolverPermissoes(Set<Long> ids) {
        if (ids == null || ids.isEmpty()) return new HashSet<>();
        Set<Permissao> encontradas = new HashSet<>(permissaoRepository.findAllById(ids));
        if (encontradas.size() != ids.size()) {
            throw new IllegalArgumentException("Uma ou mais permissões selecionadas não existem. Recarregue a página.");
        }
        return encontradas;
    }

    private void registrarEvento(String acao, Long perfilId, String nome) {
        EventoSeguranca.info(EventoSeguranca.PERMISSAO_ALTERADA)
                .addKeyValue("usuarioId", tenantCtx.getUsuarioId())
                .addKeyValue("empresaId", tenantCtx.getEmpresaId())
                .addKeyValue("perfilId", perfilId)
                .addKeyValue("perfil", nome)
                .addKeyValue("acao", acao)
                .log("Perfil de acesso " + acao);
    }

    private PerfilAcessoResponseDto toDto(PerfilAcesso p) {
        Set<String> codigos = p.getPermissoes().stream()
                .map(Permissao::getCodigo)
                .collect(Collectors.toSet());
        boolean protegido = p.getEmpresaId() == null;
        return new PerfilAcessoResponseDto(p.getId(), p.getNome(), p.getDescricao(), codigos, protegido);
    }
}
