package br.com.core4erp.contaCorrente.repository;

import br.com.core4erp.contaCorrente.entity.Transferencia;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TransferenciaRepository extends JpaRepository<Transferencia, Long> {

    /**
     * As 500 transferências mais recentes da empresa (teto de segurança — a tela não pagina e
     * espera um array), já com conta de origem/destino carregadas (sem N+1 no DTO).
     */
    @EntityGraph(attributePaths = {"contaOrigem", "contaDestino"})
    List<Transferencia> findTop500ByEmpresaIdOrderByDataTransferenciaDescIdDesc(Long empresaId);

    Optional<Transferencia> findByIdAndEmpresaId(Long id, Long empresaId);

    // S.3: bloqueia exclusão de conta corrente que ainda possui transferências (origem ou destino)
    boolean existsByContaOrigemIdOrContaDestinoId(Long contaOrigemId, Long contaDestinoId);
}
