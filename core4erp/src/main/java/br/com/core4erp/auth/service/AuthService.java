package br.com.core4erp.auth.service;

import br.com.core4erp.auth.dto.LoginRequestDto;
import br.com.core4erp.auth.dto.LoginResponseDto;
import br.com.core4erp.auth.entity.Auth;
import br.com.core4erp.auth.repository.AuthRepository;
import br.com.core4erp.user.entity.User;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final AuthRepository authRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(AuthenticationManager authenticationManager,
                       AuthRepository authRepository,
                       PasswordEncoder passwordEncoder) {
        this.authenticationManager = authenticationManager;
        this.authRepository = authRepository;
        this.passwordEncoder = passwordEncoder;
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

    public void register(User user, String username, String password, String role) {

        Optional<Auth> usernameExists = authRepository.findByUsername(username);
        if(usernameExists.isPresent())
            throw new RuntimeException("Username cadastrado");

        Auth auth = new Auth();
        auth.setUsername(username);
        auth.setPassword(passwordEncoder.encode(password));
        if(role.isEmpty())
            auth.setRole("normal-user");
        auth.setRole(role);
        auth.setUser(user);

        authRepository.save(auth);

    }

}
