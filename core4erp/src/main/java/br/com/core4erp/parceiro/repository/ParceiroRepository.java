package br.com.core4erp.parceiro.repository;

import br.com.core4erp.config.crypto.IndiceCego;
import br.com.core4erp.parceiro.entity.Parceiro;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ParceiroRepository extends JpaRepository<Parceiro, Long> {
    List<Parceiro> findAllByEmpresaId(Long empresaId);
    Page<Parceiro> findAllByEmpresaId(Long empresaId, Pageable pageable);
    Optional<Parceiro> findByIdAndEmpresaId(Long id, Long empresaId);

    // cpf_cnpj é cifrado (valor aleatório no banco): busca/unicidade SEMPRE pelo índice cego
    // (cpf_cnpj_hash = HMAC do documento normalizado — ver IndiceCego.documento).
    boolean existsByCpfCnpjHashAndEmpresaId(String cpfCnpjHash, Long empresaId);
    boolean existsByCpfCnpjHashAndEmpresaIdAndIdNot(String cpfCnpjHash, Long empresaId, Long id);
    Optional<Parceiro> findFirstByCpfCnpjHashAndEmpresaId(String cpfCnpjHash, Long empresaId);

    /** Existe parceiro com este CPF/CNPJ (texto, com ou sem máscara) na empresa? */
    default boolean existeDocumento(String cpfCnpj, Long empresaId) {
        String hash = IndiceCego.documento(cpfCnpj);
        return hash != null && existsByCpfCnpjHashAndEmpresaId(hash, empresaId);
    }

    /** Idem, ignorando o próprio parceiro (atualização). */
    default boolean existeDocumentoEmOutro(String cpfCnpj, Long empresaId, Long id) {
        String hash = IndiceCego.documento(cpfCnpj);
        return hash != null && existsByCpfCnpjHashAndEmpresaIdAndIdNot(hash, empresaId, id);
    }

    /** Casa parceiro por CPF/CNPJ — usado no import de planilha para reaproveitar o parceiro
     *  existente antes de criar um novo. */
    default Optional<Parceiro> buscarPorDocumento(String cpfCnpj, Long empresaId) {
        String hash = IndiceCego.documento(cpfCnpj);
        return hash == null ? Optional.empty() : findFirstByCpfCnpjHashAndEmpresaId(hash, empresaId);
    }

    /**
     * Busca global: razão social ou nome fantasia contendo o termo, ou CPF/CNPJ EXATO (o documento é
     * cifrado — busca parcial por documento não é possível; o termo é comparado pelo índice cego).
     */
    default List<Parceiro> buscar(Long eid, String q, Pageable pageable) {
        String hash = IndiceCego.documento(q);
        // Sentinela não-nulo: evita parâmetro nulo sem tipo no PostgreSQL (ver CLAUDE.md §14).
        return buscarPorNomeOuDocumento(eid, q, hash != null ? hash : SEM_DOCUMENTO, pageable);
    }

    /** Valor que nunca coincide com um HMAC hex (64 chars) — usado quando o termo não é documento. */
    String SEM_DOCUMENTO = "-";

    @Query("""
            SELECT p FROM Parceiro p
            WHERE p.empresaId = :eid
              AND (LOWER(p.razaoSocial) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(p.nomeFantasia) LIKE LOWER(CONCAT('%', :q, '%'))
                OR p.cpfCnpjHash = :hashDoc)
            """)
    List<Parceiro> buscarPorNomeOuDocumento(@Param("eid") Long eid, @Param("q") String q,
                                            @Param("hashDoc") String hashDoc, Pageable pageable);
}
