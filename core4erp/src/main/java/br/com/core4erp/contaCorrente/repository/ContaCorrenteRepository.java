package br.com.core4erp.contaCorrente.repository;

import br.com.core4erp.config.crypto.IndiceCego;
import br.com.core4erp.contaCorrente.entity.ContaCorrente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface ContaCorrenteRepository extends JpaRepository<ContaCorrente, Long> {
    List<ContaCorrente> findAllByEmpresaId(Long empresaId);
    Optional<ContaCorrente> findByIdAndEmpresaId(Long id, Long empresaId);
    // numero_conta é cifrado (valor aleatório no banco): busca/unicidade sempre pelo índice cego.
    boolean existsByNumeroContaHashAndEmpresaId(String numeroContaHash, Long empresaId);

    Optional<ContaCorrente> findByNumeroContaHashAndEmpresaId(String numeroContaHash, Long empresaId);

    /** Existe conta corrente com este número (texto puro) na empresa? Calcula o índice cego. */
    default boolean existeNumeroConta(String numeroConta, Long empresaId) {
        String hash = IndiceCego.numeroConta(numeroConta);
        return hash != null && existsByNumeroContaHashAndEmpresaId(hash, empresaId);
    }

    /** Localiza a conta corrente pelo número (texto puro, ex.: ACCTID do OFX) via índice cego. */
    default Optional<ContaCorrente> buscarPorNumeroConta(String numeroConta, Long empresaId) {
        String hash = IndiceCego.numeroConta(numeroConta);
        return hash == null ? Optional.empty() : findByNumeroContaHashAndEmpresaId(hash, empresaId);
    }

    @Query("SELECT COALESCE(SUM(c.saldo), 0) FROM ContaCorrente c WHERE c.empresaId = :eid")
    BigDecimal sumSaldoByEmpresaId(@Param("eid") Long eid);
}
