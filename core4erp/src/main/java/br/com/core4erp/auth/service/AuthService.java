package br.com.core4erp.auth.service;

import br.com.core4erp.auth.dto.LoginRequestDto;
import br.com.core4erp.auth.dto.MeResponseDto;
import br.com.core4erp.auth.dto.RegistrarRequestDto;
import br.com.core4erp.config.rbac.PermissaoCalculadora;
import br.com.core4erp.config.security.JwtService;
import br.com.core4erp.empresa.dto.EmpresaResumoDto;
import br.com.core4erp.empresa.entity.Empresa;
import br.com.core4erp.empresa.entity.PerfilAcesso;
import br.com.core4erp.empresa.entity.Permissao;
import br.com.core4erp.empresa.entity.UsuarioEmpresa;
import br.com.core4erp.empresa.repository.EmpresaRepository;
import br.com.core4erp.empresa.repository.PerfilAcessoRepository;
import br.com.core4erp.empresa.repository.UsuarioEmpresaPermissaoRepository;
import br.com.core4erp.empresa.repository.UsuarioEmpresaRepository;
import br.com.core4erp.usuario.entity.Usuario;
import br.com.core4erp.usuario.repository.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AuthService {

    private static final int MAX_LOGIN_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 15;

    public record LoginResult(String token, MeResponseDto usuario, List<EmpresaResumoDto> empresas) {}

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UsuarioEmpresaRepository usuarioEmpresaRepository;
    private final UsuarioEmpresaPermissaoRepository permissaoUsuarioRepository;
    private final PerfilAcessoRepository perfilAcessoRepository;
    private final EmpresaRepository empresaRepository;
    private final PermissaoCalculadora permissaoCalculadora;

    public AuthService(UsuarioRepository usuarioRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       UsuarioEmpresaRepository usuarioEmpresaRepository,
                       UsuarioEmpresaPermissaoRepository permissaoUsuarioRepository,
                       PerfilAcessoRepository perfilAcessoRepository,
                       EmpresaRepository empresaRepository,
                       PermissaoCalculadora permissaoCalculadora) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.usuarioEmpresaRepository = usuarioEmpresaRepository;
        this.permissaoUsuarioRepository = permissaoUsuarioRepository;
        this.perfilAcessoRepository = perfilAcessoRepository;
        this.empresaRepository = empresaRepository;
        this.permissaoCalculadora = permissaoCalculadora;
    }

    @Transactional
    public MeResponseDto registrar(RegistrarRequestDto request) {
        if (usuarioRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email já cadastrado");
        }

        Usuario usuario = new Usuario();
        usuario.setNome(request.nome());
        usuario.setEmail(request.email());
        usuario.setSenhaHash(passwordEncoder.encode(request.senha()));
        usuario.setTelefone(request.telefone());
        usuario.setRole("ROLE_USER");

        usuario = usuarioRepository.save(usuario);

        // Criar empresa pessoal para o novo usuário
        criarEmpresaParaUsuario(usuario);

        return toMeResponse(usuario);
    }

    @Transactional
    public LoginResult login(LoginRequestDto request) {
        Usuario usuario = usuarioRepository.findByEmail(request.email())
                .orElseThrow(() -> new BadCredentialsException("Credenciais inválidas"));

        if (usuario.getLockedUntil() != null && usuario.getLockedUntil().isAfter(LocalDateTime.now())) {
            throw new LockedException("Conta bloqueada temporariamente. Tente novamente em " + LOCKOUT_MINUTES + " minutos.");
        }

        if (!passwordEncoder.matches(request.senha(), usuario.getSenhaHash())) {
            int attempts = usuario.getLoginAttempts() + 1;
            if (attempts >= MAX_LOGIN_ATTEMPTS) {
                usuario.setLockedUntil(LocalDateTime.now().plusMinutes(LOCKOUT_MINUTES));
                usuario.setLoginAttempts(0);
            } else {
                usuario.setLoginAttempts(attempts);
            }
            usuarioRepository.save(usuario);
            throw new BadCredentialsException("Credenciais inválidas");
        }

        usuario.setLoginAttempts(0);
        usuario.setLockedUntil(null);
        usuarioRepository.save(usuario);

        String token = jwtService.generateToken(usuario.getEmail());
        List<EmpresaResumoDto> empresas = carregarEmpresasDoUsuario(usuario.getEmail());
        return new LoginResult(token, toMeResponse(usuario), empresas);
    }

    public MeResponseDto me(String email) {
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Usuário não encontrado"));
        return toMeResponse(usuario);
    }

    public EmpresaResumoDto trocarEmpresa(String email, Long empresaId) {
        UsuarioEmpresa ue = usuarioEmpresaRepository
            .findByUsuario_EmailAndEmpresaId(email, empresaId)
            .orElseThrow(() -> new EntityNotFoundException("Usuário não pertence a esta empresa"));
        if (!Boolean.TRUE.equals(ue.getAtivo())) {
            throw new IllegalStateException("Acesso inativo nesta empresa");
        }
        Set<String> doPerfil = ue.getPerfil().getPermissoes()
            .stream().map(Permissao::getCodigo).collect(Collectors.toSet());
        var diretas = permissaoUsuarioRepository
            .findByUsuarioIdAndEmpresaId(ue.getUsuario().getId(), empresaId);
        Set<String> efetivas = permissaoCalculadora.calcular(doPerfil, diretas);
        return new EmpresaResumoDto(empresaId, ue.getEmpresa().getNome(), ue.getPerfil().getNome(), efetivas);
    }

    // ---- privados ----

    private List<EmpresaResumoDto> carregarEmpresasDoUsuario(String email) {
        return usuarioEmpresaRepository.findByUsuario_EmailAndAtivoTrue(email)
            .stream()
            .map(ue -> {
                Set<String> doPerfil = ue.getPerfil().getPermissoes()
                    .stream().map(Permissao::getCodigo).collect(Collectors.toSet());
                var diretas = permissaoUsuarioRepository
                    .findByUsuarioIdAndEmpresaId(ue.getUsuario().getId(), ue.getEmpresa().getId());
                Set<String> efetivas = permissaoCalculadora.calcular(doPerfil, diretas);
                return new EmpresaResumoDto(
                    ue.getEmpresa().getId(), ue.getEmpresa().getNome(), ue.getPerfil().getNome(), efetivas);
            })
            .toList();
    }

    private void criarEmpresaParaUsuario(Usuario usuario) {
        Empresa empresa = new Empresa();
        empresa.setNome(usuario.getNome() != null ? usuario.getNome() : usuario.getEmail());
        empresa.setEmailContato(usuario.getEmail());
        empresa = empresaRepository.save(empresa);

        PerfilAcesso proprietario = perfilAcessoRepository.findByNome("PROPRIETARIO")
            .orElseThrow(() -> new IllegalStateException("Perfil PROPRIETARIO não encontrado"));

        UsuarioEmpresa ue = new UsuarioEmpresa();
        ue.setUsuario(usuario);
        ue.setEmpresa(empresa);
        ue.setPerfil(proprietario);
        usuarioEmpresaRepository.save(ue);
    }

    private MeResponseDto toMeResponse(Usuario u) {
        return new MeResponseDto(u.getId(), u.getNome(), u.getEmail(), u.getTelefone(), u.getRole(), u.getFotoPerfil());
    }
}
