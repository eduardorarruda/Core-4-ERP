package br.com.core4erp.observabilidade.repository;

import br.com.core4erp.observabilidade.entity.LogGeral;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LogGeralRepository extends JpaRepository<LogGeral, Long> {
}
