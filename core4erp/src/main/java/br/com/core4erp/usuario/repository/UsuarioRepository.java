package br.com.core4erp.usuario.repository;

import br.com.core4erp.usuario.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByEmail(String email);
    boolean existsByEmail(String email);
    Optional<Usuario> findByResetToken(String resetToken);

    @Query("SELECT u.id FROM Usuario u")
    List<Long> findAllIds();
}
