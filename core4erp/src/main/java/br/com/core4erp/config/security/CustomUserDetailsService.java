package br.com.core4erp.config.security;

import br.com.core4erp.auth.entity.Auth;
import br.com.core4erp.auth.repository.AuthRepository;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CustomUserDetailsService implements UserDetailsService {
    private final AuthRepository authRepository;

    public CustomUserDetailsService(AuthRepository authRepository) {
        this.authRepository = authRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Auth auth = authRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Credencial não encontrada"));

        return new org.springframework.security.core.userdetails.User(
                auth.getUsername(),
                auth.getPassword(),
                List.of(new SimpleGrantedAuthority("ROLE_" + auth.getRole()))
        );
    }
}
