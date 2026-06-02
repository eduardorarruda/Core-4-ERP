package br.com.core4erp.empresa.service;

import br.com.core4erp.config.rbac.PermissaoCalculadora;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.empresa.dto.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import br.com.core4erp.empresa.entity.*;
import br.com.core4erp.empresa.repository.*;
import br.com.core4erp.exception.AcessoNegadoException;
import br.com.core4erp.exception.BusinessException;
import br.com.core4erp.usuario.repository.UsuarioRepository;
import com.github.benmanes.caffeine.cache.Cache;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;

import java.time.LocalDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UsuarioPermissaoService {

    private static final Logger log = LoggerFactory.getLogger(UsuarioPermissaoService.class);

    private final UsuarioEmpresaRepository usuarioEmpresaRepository;
    private final UsuarioEmpresaPermissaoRepository permissaoUsuarioRepository;
    private final PermissaoRepository permissaoRepository;
    private final UsuarioRepository usuarioRepository;
    private final PermissaoCalculadora permissaoCalculadora;
    private final TenantContext tenantCtx;
    private final Cache<String, Set<String>> permissaoCache;

    public PermissoesUsuarioResponseDto listar(Long usuarioId) {
        UsuarioEmpresa ue = buscarMembroNaEmpresa(usuarioId);

        Set<String> doPerfil = ue.getPerfil().getPermissoes()
            .stream().map(Permissao::getCodigo).collect(Collectors.toSet());

        List<UsuarioEmpresaPermissao> diretas =
            permissaoUsuarioRepository.findByUsuarioIdAndEmpresaId(usuarioId, tenantCtx.getEmpresaId());

        // O(1) lookup usando Map para evitar O(N×M)
        Map<Long, UsuarioEmpresaPermissao> diretasPorId = diretas.stream()
            .collect(Collectors.toMap(d -> d.getPermissao().getId(), Function.identity()));

        Set<String> concedidas = diretas.stream()
            .filter(p -> !p.getRevogada()).map(p -> p.getPermissao().getCodigo()).collect(Collectors.toSet());
        Set<String> revogadas = diretas.stream()
            .filter(UsuarioEmpresaPermissao::getRevogada).map(p -> p.getPermissao().getCodigo()).collect(Collectors.toSet());

        Set<String> efetivas = permissaoCalculadora.calcular(doPerfil, diretas);

        List<PermissaoUsuarioResponseDto> todas = permissaoRepository.findAll().stream()
            .map(pm -> {
                boolean doPerfil2 = doPerfil.contains(pm.getCodigo());
                boolean concedidaDireta = concedidas.contains(pm.getCodigo());
                boolean revogadaDireta = revogadas.contains(pm.getCodigo());

                String origem;
                if (revogadaDireta)          origem = "DIRETA_REVOGADA";
                else if (concedidaDireta)    origem = "DIRETA_CONCEDIDA";
                else if (doPerfil2)          origem = "PERFIL";
                else                         origem = "SEM_ACESSO";

                UsuarioEmpresaPermissao direta = diretasPorId.get(pm.getId());
                return new PermissaoUsuarioResponseDto(
                    direta != null ? direta.getId() : null,
                    pm.getCodigo(), pm.getModulo(), pm.getAcao(), pm.getDescricao(),
                    origem,
                    direta != null ? direta.getRevogada() : null,
                    direta != null && direta.getConcedidaPor() != null
                        ? direta.getConcedidaPor().getEmail() : null,
                    direta != null ? direta.getDataConcessao() : null,
                    direta != null ? direta.getObservacao() : null
                );
            })
            .toList();

        return new PermissoesUsuarioResponseDto(
            usuarioId,
            ue.getUsuario().getEmail(),
            ue.getUsuario().getNome(),
            ue.getPerfil().getNome(),
            todas,
            efetivas
        );
    }

    @Transactional
    public PermissaoUsuarioResponseDto concederOuRevogar(Long usuarioId, PermissaoUsuarioRequestDto dto) {
        validarNaoEhProprietario(usuarioId);
        validarEscaladaDePrivilegio(dto);
        UsuarioEmpresa ue = buscarMembroNaEmpresa(usuarioId);

        Permissao permissao = permissaoRepository.findById(dto.permissaoId())
            .orElseThrow(() -> new EntityNotFoundException("Permissão não encontrada"));

        boolean revogada = Boolean.TRUE.equals(dto.revogada());

        UsuarioEmpresaPermissao registro = permissaoUsuarioRepository
            .findByUsuarioIdAndEmpresaIdAndPermissaoId(usuarioId, tenantCtx.getEmpresaId(), permissao.getId())
            .orElseGet(UsuarioEmpresaPermissao::new);

        registro.setUsuario(ue.getUsuario());
        registro.setEmpresa(ue.getEmpresa());
        registro.setPermissao(permissao);
        registro.setRevogada(revogada);
        registro.setConcedidaPor(usuarioRepository.getReferenceById(tenantCtx.getUsuarioId()));
        registro.setDataConcessao(LocalDateTime.now());
        registro.setObservacao(dto.observacao());

        // CR-B7: invalidar cache ANTES de persistir para evitar leitura com dados antigos
        invalidarCache(ue.getUsuario().getEmail());
        permissaoUsuarioRepository.save(registro);

        String origem = revogada ? "DIRETA_REVOGADA" : "DIRETA_CONCEDIDA";
        return new PermissaoUsuarioResponseDto(
            registro.getId(), permissao.getCodigo(), permissao.getModulo(),
            permissao.getAcao(), permissao.getDescricao(), origem,
            revogada, tenantCtx.getEmail(), registro.getDataConcessao(), dto.observacao()
        );
    }

    @Transactional(isolation = Isolation.SERIALIZABLE)
    public PermissoesUsuarioResponseDto substituirTodas(Long usuarioId, PermissaoUsuarioBulkRequestDto dto) {
        validarNaoEhProprietario(usuarioId);
        buscarMembroNaEmpresa(usuarioId);

        List<UsuarioEmpresaPermissao> atuais =
            permissaoUsuarioRepository.findByUsuarioIdAndEmpresaId(usuarioId, tenantCtx.getEmpresaId());
        permissaoUsuarioRepository.deleteAll(atuais);
        permissaoUsuarioRepository.flush();

        dto.permissoes().forEach(p -> concederOuRevogar(usuarioId, p));
        return listar(usuarioId);
    }

    @Transactional
    public void removerPermissaoDireta(Long usuarioId, Long permissaoId) {
        validarNaoEhProprietario(usuarioId);
        UsuarioEmpresa ue = buscarMembroNaEmpresa(usuarioId);
        permissaoUsuarioRepository.deleteByUsuarioIdAndEmpresaIdAndPermissaoId(
            usuarioId, tenantCtx.getEmpresaId(), permissaoId
        );
        invalidarCache(ue.getUsuario().getEmail());
    }

    // ---- privados ----

    private UsuarioEmpresa buscarMembroNaEmpresa(Long usuarioId) {
        return usuarioEmpresaRepository
            .findByUsuarioIdAndEmpresaIdAndAtivoTrue(usuarioId, tenantCtx.getEmpresaId())
            .orElseThrow(() -> new EntityNotFoundException("Usuário não encontrado nesta empresa ou inativo"));
    }

    private void validarNaoEhProprietario(Long usuarioId) {
        usuarioEmpresaRepository
            .findByUsuarioIdAndEmpresaIdAndAtivoTrue(usuarioId, tenantCtx.getEmpresaId())
            .ifPresent(ue -> {
                if ("PROPRIETARIO".equals(ue.getPerfil().getNome())) {
                    throw new BusinessException("OPERACAO_INVALIDA",
                        "Permissões do proprietário não podem ser alteradas individualmente.");
                }
            });
    }

    private void validarEscaladaDePrivilegio(PermissaoUsuarioRequestDto dto) {
        if (Boolean.TRUE.equals(dto.revogada())) return;
        Permissao p = permissaoRepository.findById(dto.permissaoId())
            .orElseThrow(() -> new EntityNotFoundException("Permissão não encontrada"));
        if (!tenantCtx.temPermissao(p.getCodigo())) {
            // CR-B8: log interno específico, mensagem externa genérica
            log.warn("Escalada de privilégio negada: usuarioId={} tentouConceder={}",
                tenantCtx.getUsuarioId(), p.getCodigo());
            throw new AcessoNegadoException("Permissão insuficiente para esta operação");
        }
    }

    private void invalidarCache(String email) {
        // CR-B10: hash determinístico evita colisão quando email contém ':'
        permissaoCache.invalidate(Integer.toHexString(
            Objects.hash(email, tenantCtx.getEmpresaId())));
    }
}
