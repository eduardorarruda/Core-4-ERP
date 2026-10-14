package br.com.core4erp.auth.service;

import br.com.core4erp.auth.dto.DadosPessoaisResponseDto;
import br.com.core4erp.auth.dto.DadosPessoaisResponseDto.Consentimento;
import br.com.core4erp.auth.dto.DadosPessoaisResponseDto.Titular;
import br.com.core4erp.auth.dto.DadosPessoaisResponseDto.VinculoEmpresa;
import br.com.core4erp.config.rbac.EscaladaPrivilegioValidator;
import br.com.core4erp.config.security.EventoSeguranca;
import br.com.core4erp.config.security.SessaoUsuarioService;
import br.com.core4erp.config.tenant.PermissaoCacheService;
import br.com.core4erp.empresa.entity.Empresa;
import br.com.core4erp.empresa.entity.UsuarioEmpresa;
import br.com.core4erp.empresa.repository.UsuarioEmpresaRepository;
import br.com.core4erp.exception.BusinessException;
import br.com.core4erp.usuario.entity.Usuario;
import br.com.core4erp.usuario.repository.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;

/**
 * Direitos do titular (LGPD art. 18): exportação dos dados pessoais e exclusão da conta.
 *
 * <p><b>Exclusão = anonimização</b>: os dados pessoais do usuário são apagados/substituídos, os
 * vínculos com empresas são desativados e todas as sessões revogadas. Registros financeiros
 * pertencem à EMPRESA e são mantidos (retenção legal/fiscal — LGPD art. 16, I).
 */
@Service
public class ContaUsuarioService {

    static final String NOME_ANONIMO = "Usuário removido";
    static final String NOME_EMPRESA_REMOVIDA = "Conta removida";
    private static final int BYTES_SENHA_ALEATORIA = 32;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UsuarioRepository usuarioRepository;
    private final UsuarioEmpresaRepository usuarioEmpresaRepository;
    private final PasswordEncoder passwordEncoder;
    private final SessaoUsuarioService sessaoUsuarioService;
    private final PermissaoCacheService permissaoCacheService;

    public ContaUsuarioService(UsuarioRepository usuarioRepository,
                               UsuarioEmpresaRepository usuarioEmpresaRepository,
                               PasswordEncoder passwordEncoder,
                               SessaoUsuarioService sessaoUsuarioService,
                               PermissaoCacheService permissaoCacheService) {
        this.usuarioRepository = usuarioRepository;
        this.usuarioEmpresaRepository = usuarioEmpresaRepository;
        this.passwordEncoder = passwordEncoder;
        this.sessaoUsuarioService = sessaoUsuarioService;
        this.permissaoCacheService = permissaoCacheService;
    }

    @Transactional(readOnly = true)
    public DadosPessoaisResponseDto exportarDados(String email) {
        Usuario u = buscar(email);
        List<VinculoEmpresa> vinculos = usuarioEmpresaRepository.findByUsuarioId(u.getId()).stream()
                .map(ue -> new VinculoEmpresa(ue.getEmpresa().getId(), ue.getEmpresa().getNome(),
                        ue.getPerfil().getNome(), Boolean.TRUE.equals(ue.getAtivo()), ue.getDataIngresso()))
                .toList();
        DadosPessoaisResponseDto dados = new DadosPessoaisResponseDto(
                LocalDateTime.now(),
                new Titular(u.getId(), u.getNome(), u.getEmail(), u.getTelefone(),
                        u.getTipoConta() != null ? u.getTipoConta().name() : null,
                        u.getFotoPerfil() != null && !u.getFotoPerfil().isBlank(),
                        u.getCreatedDate(), u.getLastModifiedDate()),
                new Consentimento(u.getTermosAceitosEm(), u.getTermosVersao()),
                vinculos);
        EventoSeguranca.info(EventoSeguranca.DADOS_EXPORTADOS)
                .addKeyValue("usuarioId", u.getId())
                .log("Titular exportou seus dados pessoais");
        return dados;
    }

    @Transactional
    public void excluirConta(String email, String senha) {
        Usuario u = buscar(email);
        if (!passwordEncoder.matches(senha, u.getSenhaHash())) {
            EventoSeguranca.warn(EventoSeguranca.CONTA_EXCLUIDA)
                    .addKeyValue("usuarioId", u.getId())
                    .addKeyValue("resultado", "senha_incorreta")
                    .log("Exclusão de conta recusada");
            throw new BusinessException("SENHA_INCORRETA", "Senha incorreta.");
        }

        List<UsuarioEmpresa> vinculos = usuarioEmpresaRepository.findByUsuarioId(u.getId());
        bloquearSeProprietarioComMembros(u, vinculos);

        String emailOriginal = u.getEmail();
        for (UsuarioEmpresa ue : vinculos) {
            permissaoCacheService.invalidar(emailOriginal, ue.getEmpresa().getId());
            if (EscaladaPrivilegioValidator.ehPerfilProprietario(ue.getPerfil())) {
                anonimizarEmpresaSolo(ue.getEmpresa(), u);
            }
            ue.setAtivo(false);
        }
        usuarioEmpresaRepository.saveAll(vinculos);

        sessaoUsuarioService.revogarTokens(u);
        anonimizar(u);
        usuarioRepository.save(u);
        sessaoUsuarioService.invalidar(emailOriginal);

        EventoSeguranca.info(EventoSeguranca.CONTA_EXCLUIDA)
                .addKeyValue("usuarioId", u.getId())
                .addKeyValue("resultado", "sucesso")
                .addKeyValue("vinculosDesativados", vinculos.size())
                .log("Conta excluída (dados pessoais anonimizados)");
    }

    /** Proprietário de empresa com outros membros ativos precisa resolver a empresa antes (409). */
    private void bloquearSeProprietarioComMembros(Usuario u, List<UsuarioEmpresa> vinculos) {
        boolean bloqueia = vinculos.stream()
                .filter(ue -> Boolean.TRUE.equals(ue.getAtivo()))
                .filter(ue -> EscaladaPrivilegioValidator.ehPerfilProprietario(ue.getPerfil()))
                .anyMatch(ue -> usuarioEmpresaRepository
                        .countByEmpresaIdAndAtivoTrueAndUsuarioIdNot(ue.getEmpresa().getId(), u.getId()) > 0);
        if (bloqueia) {
            throw new BusinessException("REGISTRO_EM_USO",
                    "Você é proprietário de uma empresa que ainda tem outros membros ativos. "
                            + "Remova os membros da empresa antes de excluir sua conta.");
        }
    }

    /**
     * Empresa da qual o usuário era o único dono/membro: é desativada (schedulers param) e perde
     * os dados de contato pessoais. Os lançamentos financeiros permanecem (retenção legal).
     */
    private static void anonimizarEmpresaSolo(Empresa empresa, Usuario u) {
        empresa.setAtiva(false);
        if (u.getEmail().equalsIgnoreCase(empresa.getEmailContato())) {
            empresa.setEmailContato(null);
        }
        if (u.getNome() != null && u.getNome().equals(empresa.getNome())) {
            empresa.setNome(NOME_EMPRESA_REMOVIDA);
        }
    }

    private void anonimizar(Usuario u) {
        byte[] aleatorio = new byte[BYTES_SENHA_ALEATORIA];
        RANDOM.nextBytes(aleatorio);
        u.setNome(NOME_ANONIMO);
        u.setEmail("removido-" + u.getId() + "@anonimo.invalid");
        u.setTelefone(null);
        u.setFotoPerfil(null);
        // Hash de um segredo aleatório descartado: ninguém consegue mais autenticar
        u.setSenhaHash(passwordEncoder.encode(Base64.getEncoder().encodeToString(aleatorio)));
        u.setResetToken(null);
        u.setResetTokenExpiry(null);
        u.setSenhaProvisoria(false);
        u.setLoginAttempts(0);
        u.setLockedUntil(null);
    }

    private Usuario buscar(String email) {
        return usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Usuário não encontrado"));
    }
}
