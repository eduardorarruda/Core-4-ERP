package br.com.core4erp.auth.service;

import br.com.core4erp.auth.dto.LoginRequestDto;
import br.com.core4erp.auth.dto.LoginResponseDto;
import br.com.core4erp.auth.entity.Auth;
import br.com.core4erp.auth.repository.AuthRepository;
import lombok.Data;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.util.Optional;

@Data
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final AuthRepository authRepository;

    public AuthService(AuthenticationManager authenticationManager, AuthRepository authRepository) {
        this.authenticationManager = authenticationManager;
        this.authRepository = authRepository;
    }

    public LoginResponseDto login(LoginRequestDto request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        Optional<Auth> auth = authRepository.findByUsername(authentication.getName());
        if(auth.isEmpty())
            throw new RuntimeException("Credencial autenticada não encontrada");


        return new LoginResponseDto(
                "Login realizado com sucesso",
                auth.get().getUsername(),
                auth.get().getRole()
        );
    }

}
