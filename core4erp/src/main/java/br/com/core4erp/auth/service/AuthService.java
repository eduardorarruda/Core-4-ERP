package br.com.core4erp.auth.service;

import br.com.core4erp.auth.dto.LoginRequestDto;
import br.com.core4erp.auth.dto.MeResponseDto;
import br.com.core4erp.auth.dto.RegistrarRequestDto;
import br.com.core4erp.auth.dto.TrocarSenhaRequestDto;
import br.com.core4erp.config.rbac.PermissaoCalculadora;
import br.com.core4erp.config.security.EventoSeguranca;
import br.com.core4erp.config.security.JwtService;
import br.com.core4erp.config.security.SessaoUsuarioService;
import br.com.core4erp.exception.BusinessException;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AuthService {

    /**
     * Rede de segurança: falhas seguidas (de QUALQUER IP) que bloqueiam a conta no banco. Alto de
     * propósito — o bloqueio do dia a dia é por conta + IP ({@link TentativasLoginService}), para
     * que um atacante em outro IP não tranque o dono legítimo fora com poucas tentativas.
     */
    static final int MAX_FALHAS_CONTA = 20;
    private static final int LOCKOUT_MINUTES = 15;
    /** Mesma resposta para senha errada, conta inexistente e conta/IP bloqueados (sem enumeração). */
    private static final String CREDENCIAIS_INVALIDAS = "Credenciais inválidas";
    static final String ROLE_USUARIO = "ROLE_USER";

    public record LoginResult(String token, MeResponseDto usuario, List<EmpresaResumoDto> empresas, Boolean senhaProvisoria, Boolean adminSistema) {}

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UsuarioEmpresaRepository usuarioEmpresaRepository;
    private final UsuarioEmpresaPermissaoRepository permissaoUsuarioRepository;
    private final PerfilAcessoRepository perfilAcessoRepository;
    private final EmpresaRepository empresaRepository;
    private final PermissaoCalculadora permissaoCalculadora;
    private final SessaoUsuarioService sessaoUsuarioService;
    private final TentativasLoginService tentativasLogin;

    // S.14: hash bcrypt "dummy" para nivelar o tempo de resposta quando o e-mail não existe
    // (evita enumeração de usuários por timing). Gerado no boot com o MESMO custo do encoder
    // (12) — um hash fixo de custo 10 responderia mais rápido e denunciaria contas inexistentes.
    private final String dummyHash;

    public AuthService(UsuarioRepository usuarioRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       UsuarioEmpresaRepository usuarioEmpresaRepository,
                       UsuarioEmpresaPermissaoRepository permissaoUsuarioRepository,
                       PerfilAcessoRepository perfilAcessoRepository,
                       EmpresaRepository empresaRepository,
                       PermissaoCalculadora permissaoCalculadora,
                       SessaoUsuarioService sessaoUsuarioService,
                       TentativasLoginService tentativasLogin) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.usuarioEmpresaRepository = usuarioEmpresaRepository;
        this.permissaoUsuarioRepository = permissaoUsuarioRepository;
        this.perfilAcessoRepository = perfilAcessoRepository;
        this.empresaRepository = empresaRepository;
        this.permissaoCalculadora = permissaoCalculadora;
        this.sessaoUsuarioService = sessaoUsuarioService;
        this.tentativasLogin = tentativasLogin;
        this.dummyHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    @Transactional
    public MeResponseDto registrar(RegistrarRequestDto request, String ip) {
        if (usuarioRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email já cadastrado");
        }

        Usuario.TipoConta tipoConta = request.tipoConta() != null
            ? request.tipoConta()
            : Usuario.TipoConta.EMPRESA;

        Usuario usuario = new Usuario();
        usuario.setNome(request.nome());
        usuario.setEmail(request.email());
        usuario.setSenhaHash(passwordEncoder.encode(request.senha()));
        usuario.setTelefone(request.telefone());
        // Auto-cadastro NUNCA recebe papel administrativo: o poder do dono da conta vem do perfil
        // PROPRIETARIO na própria empresa (RBAC por empresa), não de um papel global.
        usuario.setRole(ROLE_USUARIO);
        usuario.setTipoConta(tipoConta);
        // LGPD art. 8º — registro do consentimento (validado no DTO: aceiteTermos == true)
        usuario.setTermosAceitosEm(LocalDateTime.now());
        usuario.setTermosVersao(request.versaoTermos().trim());

        usuario = usuarioRepository.save(usuario);

        String nomeEmpresa = (tipoConta == Usuario.TipoConta.EMPRESA
            && request.nomeEmpresa() != null
            && !request.nomeEmpresa().isBlank())
            ? request.nomeEmpresa()
            : usuario.getNome();

        criarEmpresaParaUsuario(usuario, nomeEmpresa);

        EventoSeguranca.info(EventoSeguranca.REGISTRO)
            .addKeyValue("usuarioId", usuario.getId())
            .addKeyValue("emailHash", EventoSeguranca.hashEmail(usuario.getEmail()))
            .addKeyValue("tipoConta", tipoConta.name())
            .addKeyValue("termosVersao", usuario.getTermosVersao())
            .log("Nova conta registrada");
        return toMeResponse(usuario);
    }

    /**
     * Login. Toda recusa responde o MESMO 401 genérico — senha errada, e-mail inexistente, conta
     * bloqueada no banco ou (e-mail + IP) em backoff —, então a resposta não revela se a conta existe.
     * O bloqueio é registrado como evento de segurança.
     */
    @Transactional(noRollbackFor = BadCredentialsException.class)
    public LoginResult login(LoginRequestDto request, String ip) {
        if (tentativasLogin.estaBloqueado(request.email(), ip)) {
            EventoSeguranca.warn(EventoSeguranca.LOGIN_BLOQUEADO)
                .addKeyValue("emailHash", EventoSeguranca.hashEmail(request.email()))
                .addKeyValue("escopo", "conta_ip")
                .log("Tentativa de login durante bloqueio temporário (e-mail + IP)");
            throw new BadCredentialsException(CREDENCIAIS_INVALIDAS);
        }

        Usuario usuario = usuarioRepository.findByEmail(request.email()).orElse(null);

        // S.14: e-mail inexistente — executa um bcrypt "dummy" para nivelar o tempo de resposta
        // e não permitir enumeração de contas por diferença de tempo.
        if (usuario == null) {
            passwordEncoder.matches(request.senha(), dummyHash);
            registrarFalha(request.email(), null, ip, "usuario_inexistente");
            throw new BadCredentialsException(CREDENCIAIS_INVALIDAS);
        }

        // O bcrypt roda SEMPRE (inclusive em conta bloqueada) para o tempo não denunciar o bloqueio.
        boolean senhaConfere = passwordEncoder.matches(request.senha(), usuario.getSenhaHash());

        if (usuario.getLockedUntil() != null && usuario.getLockedUntil().isAfter(LocalDateTime.now())) {
            EventoSeguranca.warn(EventoSeguranca.LOGIN_BLOQUEADO)
                .addKeyValue("usuarioId", usuario.getId())
                .addKeyValue("emailHash", EventoSeguranca.hashEmail(request.email()))
                .addKeyValue("escopo", "conta")
                .log("Tentativa de login em conta bloqueada temporariamente");
            throw new BadCredentialsException(CREDENCIAIS_INVALIDAS);
        }

        if (!senhaConfere) {
            int attempts = usuario.getLoginAttempts() + 1;
            if (attempts >= MAX_FALHAS_CONTA) {
                usuario.setLockedUntil(LocalDateTime.now().plusMinutes(LOCKOUT_MINUTES));
                usuario.setLoginAttempts(0);
                EventoSeguranca.warn(EventoSeguranca.CONTA_BLOQUEADA)
                    .addKeyValue("usuarioId", usuario.getId())
                    .addKeyValue("emailHash", EventoSeguranca.hashEmail(request.email()))
                    .addKeyValue("minutos", LOCKOUT_MINUTES)
                    .log("Conta bloqueada após muitas tentativas de login sem sucesso (rede de segurança)");
            } else {
                usuario.setLoginAttempts(attempts);
            }
            usuarioRepository.save(usuario);
            registrarFalha(request.email(), usuario.getId(), ip, "senha_incorreta");
            throw new BadCredentialsException(CREDENCIAIS_INVALIDAS);
        }

        tentativasLogin.limpar(request.email(), ip);
        usuario.setLoginAttempts(0);
        usuario.setLockedUntil(null);
        usuarioRepository.save(usuario);

        String token = jwtService.generateToken(usuario.getEmail(), usuario.getTokenVersion());
        List<EmpresaResumoDto> empresas = carregarEmpresasDoUsuario(usuario.getEmail());
        EventoSeguranca.info(EventoSeguranca.LOGIN_SUCESSO)
            .addKeyValue("usuarioId", usuario.getId())
            .log("Login realizado");
        return new LoginResult(token, toMeResponse(usuario), empresas,
            Boolean.TRUE.equals(usuario.getSenhaProvisoria()),
            Boolean.TRUE.equals(usuario.getAdminSistema()));
    }

    /** Conta a falha no backoff por (e-mail + IP) e registra o evento de segurança. */
    private void registrarFalha(String email, Long usuarioId, String ip, String motivo) {
        Duration bloqueio = tentativasLogin.registrarFalha(email, ip);
        EventoSeguranca.warn(EventoSeguranca.LOGIN_FALHA)
            .addKeyValue("emailHash", EventoSeguranca.hashEmail(email))
            .addKeyValue("usuarioId", usuarioId)
            .addKeyValue("motivo", motivo)
            .addKeyValue("bloqueioSegundos", bloqueio == null ? null : bloqueio.toSeconds())
            .log("Falha de login");
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

    /**
     * Troca a senha confirmando a atual. Revoga todos os tokens (outras sessões caem) e devolve
     * um token novo para a sessão atual continuar. Também libera a conta com senha provisória.
     */
    @Transactional
    public String trocarSenha(String email, TrocarSenhaRequestDto dto) {
        Usuario usuario = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new EntityNotFoundException("Usuário não encontrado"));

        if (!passwordEncoder.matches(dto.senhaAtual(), usuario.getSenhaHash())) {
            EventoSeguranca.warn(EventoSeguranca.SENHA_ALTERADA)
                .addKeyValue("usuarioId", usuario.getId())
                .addKeyValue("resultado", "senha_atual_incorreta")
                .log("Troca de senha recusada");
            throw new BusinessException("SENHA_INCORRETA", "Senha atual incorreta");
        }

        usuario.setSenhaHash(passwordEncoder.encode(dto.novaSenha()));
        usuario.setSenhaProvisoria(false);
        sessaoUsuarioService.revogarTokens(usuario);
        usuarioRepository.save(usuario);
        EventoSeguranca.info(EventoSeguranca.SENHA_ALTERADA)
            .addKeyValue("usuarioId", usuario.getId())
            .addKeyValue("resultado", "sucesso")
            .log("Senha alterada; demais sessões revogadas");
        return jwtService.generateToken(usuario.getEmail(), usuario.getTokenVersion());
    }

    /** "Sair de todos os dispositivos": incrementa a versão de token do usuário. */
    @Transactional
    public void logoutTodos(String email) {
        Usuario usuario = usuarioRepository.findByEmail(email)
            .orElseThrow(() -> new EntityNotFoundException("Usuário não encontrado"));
        sessaoUsuarioService.revogarTokens(usuario);
        usuarioRepository.save(usuario);
        EventoSeguranca.info(EventoSeguranca.LOGOUT_TODOS)
            .addKeyValue("usuarioId", usuario.getId())
            .log("Logout de todos os dispositivos");
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

    private void criarEmpresaParaUsuario(Usuario usuario, String nomeEmpresa) {
        Empresa empresa = new Empresa();
        empresa.setNome(nomeEmpresa != null && !nomeEmpresa.isBlank() ? nomeEmpresa : usuario.getEmail());
        empresa.setEmailContato(usuario.getEmail());
        empresa = empresaRepository.save(empresa);

        PerfilAcesso proprietario = perfilAcessoRepository.findByNomeAndEmpresaIdIsNull("PROPRIETARIO")
            .orElseThrow(() -> new IllegalStateException("Perfil PROPRIETARIO não encontrado"));

        UsuarioEmpresa ue = new UsuarioEmpresa();
        ue.setUsuario(usuario);
        ue.setEmpresa(empresa);
        ue.setPerfil(proprietario);
        usuarioEmpresaRepository.save(ue);
    }

    private MeResponseDto toMeResponse(Usuario u) {
        String tipoConta = u.getTipoConta() != null ? u.getTipoConta().name() : null;
        return new MeResponseDto(u.getId(), u.getNome(), u.getEmail(), u.getTelefone(), u.getRole(), u.getFotoPerfil(), tipoConta);
    }
}
