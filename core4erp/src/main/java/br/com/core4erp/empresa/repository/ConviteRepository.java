package br.com.core4erp.empresa.repository;

import br.com.core4erp.empresa.entity.Convite;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ConviteRepository extends JpaRepository<Convite, Long> {

    Optional<Convite> findByToken(String token);

    Optional<Convite> findByEmpresaIdAndEmailConvidado(Long empresaId, String email);

    List<Convite> findByEmpresaIdAndAceitoFalse(Long empresaId);

    Page<Convite> findByEmpresaIdAndAceitoFalse(Long empresaId, Pageable pageable);

    boolean existsByEmpresaIdAndEmailConvidadoAndAceitoFalse(Long empresaId, String email);

    List<Convite> findByAceitoFalseAndExpiraEmBefore(LocalDateTime momento);
}
