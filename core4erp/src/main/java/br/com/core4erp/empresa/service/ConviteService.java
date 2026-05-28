package br.com.core4erp.empresa.service;

import br.com.core4erp.auth.service.EmailService;
import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.empresa.dto.AceitarConviteRequestDto;
import br.com.core4erp.empresa.dto.ConvidarOperadorRequestDto;
import br.com.core4erp.empresa.dto.ConviteResponseDto;
import br.com.core4erp.empresa.entity.Convite;
import br.com.core4erp.empresa.entity.Empresa;
import br.com.core4erp.empresa.entity.PerfilAcesso;
import br.com.core4erp.empresa.entity.UsuarioEmpresa;
import br.com.core4erp.empresa.repository.ConviteRepository;
import br.com.core4erp.empresa.repository.EmpresaRepository;
import br.com.core4erp.empresa.repository.PerfilAcessoRepository;
import br.com.core4erp.empresa.repository.UsuarioEmpresaRepository;
import br.com.core4erp.exception.BusinessException;
import br.com.core4erp.usuario.entity.Usuario;
import br.com.core4erp.usuario.repository.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ConviteService {

    private static final int CONVITE_VALIDADE_HORAS = 48;

    private final ConviteRepository conviteRepository;
    private final UsuarioEmpresaRepository usuarioEmpresaRepository;
    private final PerfilAcessoRepository perfilAcessoRepository;
    private final EmpresaRepository empresaRepository;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final PlanoLimitValidator planoLimitValidator;
    private final TokenGenerator tokenGenerator;
    private final TenantContext tenantCtx;
    private final EmailService emailService;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Transactional
    @Requer("USUARIO_CONVIDAR")
    public ConviteResponseDto convidar(ConvidarOperadorRequestDto dto) {
        Long empresaId = tenantCtx.getEmpresaId();
        planoLimitValidator.validar(empresaId);

        PerfilAcesso perfil = perfilAcessoRepository.findById(dto.perfilId())
            .orElseThrow(() -> new EntityNotFoundException("Perfil não encontrado"));

        Optional<Usuario> usuarioExistente = usuarioRepository.findByEmail(dto.email());
        if (usuarioExistente.isPresent()) {
            return adicionarDiretamente(usuarioExistente.get(), empresaId, perfil);
        }

        if (conviteRepository.existsByEmpresaIdAndEmailConvidadoAndAceitoFalse(empresaId, dto.email())) {
            throw new BusinessException("CONVITE_PENDENTE",
                "Já existe um convite pendente para " + dto.email());
        }

        Empresa empresa = empresaRepository.getReferenceById(empresaId);
        Usuario convidadoPor = usuarioRepository.getReferenceById(tenantCtx.getUsuarioId());

        Convite convite = new Convite();
        convite.setEmpresa(empresa);
        convite.setEmailConvidado(dto.email().toLowerCase());
        convite.setPerfil(perfil);
        convite.setToken(tokenGenerator.gerar());
        convite.setExpiraEm(LocalDateTime.now().plusHours(CONVITE_VALIDADE_HORAS));
        convite.setConvidadoPor(convidadoPor);

        Convite salvo = conviteRepository.save(convite);

        log.info("Convite criado — empresaId={} emailConvidado={} perfilId={} expiraEm={}",
            empresaId, dto.email(), dto.perfilId(), salvo.getExpiraEm());

        emailService.enviarConvite(salvo.getEmailConvidado(), salvo.getToken(),
            frontendUrl, empresa.getNome());

        return toDto(salvo);
    }

    public ConviteResponseDto buscarPorToken(String token) {
        Convite convite = conviteRepository.findByToken(token)
            .orElseThrow(() -> new EntityNotFoundException("Convite inválido"));
        if (!convite.estaValido()) {
            throw new BusinessException("CONVITE_EXPIRADO", "Este convite expirou ou já foi utilizado");
        }
        return toDto(convite);
    }

    @Transactional
    public void aceitar(AceitarConviteRequestDto dto) {
        Convite convite = conviteRepository.findByToken(dto.token())
            .orElseThrow(() -> new EntityNotFoundException("Convite inválido"));

        if (!convite.estaValido()) {
            throw new BusinessException("CONVITE_EXPIRADO", "Este convite expirou ou já foi utilizado");
        }

        Usuario usuario = new Usuario();
        usuario.setNome(dto.nome());
        usuario.setEmail(convite.getEmailConvidado());
        usuario.setSenhaHash(passwordEncoder.encode(dto.senha()));
        usuario.setTipoConta(Usuario.TipoConta.EMPRESA);
        usuario.setSenhaProvisoria(false);
        usuario.setRole("ROLE_USER");
        usuarioRepository.save(usuario);

        criarVinculo(usuario, convite.getEmpresa(), convite.getPerfil(), convite.getConvidadoPor());

        convite.setAceito(true);
        conviteRepository.save(convite);

        log.info("Convite aceito — emailConvidado={} empresaId={} perfilId={}",
            convite.getEmailConvidado(),
            convite.getEmpresa().getId(),
            convite.getPerfil().getId());
    }

    @Transactional
    @Requer("USUARIO_CONVIDAR")
    public ConviteResponseDto reenviar(Long conviteId) {
        Long empresaId = tenantCtx.getEmpresaId();

        Convite convite = conviteRepository.findById(conviteId)
            .orElseThrow(() -> new EntityNotFoundException("Convite não encontrado"));

        if (!convite.getEmpresa().getId().equals(empresaId)) {
            throw new BusinessException("CONVITE_NAO_PERTENCE", "Convite não pertence a esta empresa");
        }
        if (convite.getAceito()) {
            throw new BusinessException("CONVITE_JA_ACEITO", "Este convite já foi aceito");
        }

        convite.setToken(tokenGenerator.gerar());
        convite.setExpiraEm(LocalDateTime.now().plusHours(CONVITE_VALIDADE_HORAS));
        Convite salvo = conviteRepository.save(convite);

        log.info("Convite reenviado — empresaId={} emailConvidado={} conviteId={}",
            empresaId, salvo.getEmailConvidado(), conviteId);

        emailService.enviarConvite(salvo.getEmailConvidado(), salvo.getToken(),
            frontendUrl, salvo.getEmpresa().getNome());

        return toDto(salvo);
    }

    @Requer("USUARIO_VISUALIZAR")
    public Page<ConviteResponseDto> listarPendentes(Pageable pageable) {
        return conviteRepository
            .findByEmpresaIdAndAceitoFalse(tenantCtx.getEmpresaId(), pageable)
            .map(this::toDto);
    }

    public List<ConviteResponseDto> listarPendentesLista() {
        return conviteRepository
            .findByEmpresaIdAndAceitoFalse(tenantCtx.getEmpresaId())
            .stream().map(this::toDto).toList();
    }

    private ConviteResponseDto adicionarDiretamente(Usuario usuario, Long empresaId, PerfilAcesso perfil) {
        if (usuarioEmpresaRepository.existsByUsuarioIdAndEmpresaId(usuario.getId(), empresaId)) {
            throw new BusinessException("USUARIO_JA_MEMBRO", "Este usuário já é membro da empresa");
        }
        Empresa empresa = empresaRepository.getReferenceById(empresaId);
        Usuario convidadoPor = usuarioRepository.getReferenceById(tenantCtx.getUsuarioId());
        criarVinculo(usuario, empresa, perfil, convidadoPor);
        return new ConviteResponseDto(null, usuario.getEmail(), perfil.getNome(),
            null, true, tenantCtx.getEmail());
    }

    private UsuarioEmpresa criarVinculo(Usuario usuario, Empresa empresa,
                                        PerfilAcesso perfil, Usuario convidadoPor) {
        UsuarioEmpresa ue = new UsuarioEmpresa();
        ue.setUsuario(usuario);
        ue.setEmpresa(empresa);
        ue.setPerfil(perfil);
        ue.setConvidadoPor(convidadoPor);
        return usuarioEmpresaRepository.save(ue);
    }

    private ConviteResponseDto toDto(Convite c) {
        return new ConviteResponseDto(
            c.getId(), c.getEmailConvidado(),
            c.getPerfil().getNome(), c.getExpiraEm(),
            c.getAceito(),
            c.getConvidadoPor() != null ? c.getConvidadoPor().getEmail() : null
        );
    }
}
