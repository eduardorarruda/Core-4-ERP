package br.com.core4erp.auth.service;

import br.com.core4erp.auth.dto.EsqueciSenhaRequestDto;
import br.com.core4erp.auth.dto.EsqueciSenhaResponseDto;
import br.com.core4erp.auth.dto.RedefinirSenhaRequestDto;
import br.com.core4erp.usuario.entity.Usuario;
import br.com.core4erp.usuario.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
public class PasswordResetService {

    private static final int RESET_TOKEN_EXPIRY_MINUTES = 60;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final TransactionTemplate tx;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    public PasswordResetService(UsuarioRepository usuarioRepository,
                                PasswordEncoder passwordEncoder,
                                EmailService emailService,
                                @Qualifier("transactionManager") PlatformTransactionManager txManager) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.tx = new TransactionTemplate(txManager);
    }

    /**
     * Gera token de reset e envia e-mail. O token é persistido em transação própria
     * que commita ANTES do envio, garantindo que a falha de SMTP não reverta o token.
     */
    public EsqueciSenhaResponseDto gerarTokenReset(EsqueciSenhaRequestDto request) {
        String[] resultado = tx.execute(status -> {
            Usuario usuario = usuarioRepository.findByEmail(request.email()).orElse(null);
            if (usuario == null) return null;

            byte[] bytes = new byte[24];
            SECURE_RANDOM.nextBytes(bytes);
            String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

            usuario.setResetToken(token);
            usuario.setResetTokenExpiry(LocalDateTime.now().plusMinutes(RESET_TOKEN_EXPIRY_MINUTES));
            usuarioRepository.save(usuario);

            return new String[]{token, usuario.getEmail()};
        });

        if (resultado != null) {
            emailService.enviarResetSenha(resultado[1], resultado[0], frontendUrl);
        }

        return new EsqueciSenhaResponseDto(
                "Se este e-mail estiver cadastrado, você receberá as instruções de recuperação."
        );
    }

    @Transactional
    public void redefinirSenha(RedefinirSenhaRequestDto request) {
        Usuario usuario = usuarioRepository.findByResetToken(request.token())
                .orElseThrow(() -> new IllegalArgumentException("Token inválido ou expirado."));

        if (usuario.getResetTokenExpiry() == null ||
                usuario.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            usuario.setResetToken(null);
            usuario.setResetTokenExpiry(null);
            usuarioRepository.save(usuario);
            throw new IllegalArgumentException("Token inválido ou expirado.");
        }

        usuario.setSenhaHash(passwordEncoder.encode(request.novaSenha()));
        usuario.setResetToken(null);
        usuario.setResetTokenExpiry(null);
        usuario.setLoginAttempts(0);
        usuario.setLockedUntil(null);
        usuarioRepository.save(usuario);
    }
}
