package br.com.core4erp.conta.repository;

import br.com.core4erp.conta.entity.Conta;
import br.com.core4erp.enums.StatusConta;
import br.com.core4erp.enums.TipoConta;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;

public final class ContaSpec {

    private ContaSpec() {}

    public static Specification<Conta> usuarioId(Long uid) {
        return (r, q, cb) -> cb.equal(r.get("usuario").get("id"), uid);
    }

    public static Specification<Conta> tipo(TipoConta tipo) {
        return (r, q, cb) -> cb.equal(r.get("tipo"), tipo);
    }

    public static Specification<Conta> status(StatusConta status) {
        return (r, q, cb) -> cb.equal(r.get("status"), status);
    }

    public static Specification<Conta> numeroDocumentoContains(String term) {
        return (r, q, cb) -> cb.like(cb.lower(r.get("numeroDocumento")), "%" + term.toLowerCase() + "%");
    }

    public static Specification<Conta> vencimentoApartirDe(LocalDate inicio) {
        return (r, q, cb) -> cb.greaterThanOrEqualTo(r.get("dataVencimento"), inicio);
    }

    public static Specification<Conta> vencimentoAte(LocalDate fim) {
        return (r, q, cb) -> cb.lessThanOrEqualTo(r.get("dataVencimento"), fim);
    }

    public static Specification<Conta> parceiroId(Long parceiroId) {
        return (r, q, cb) -> cb.equal(r.get("parceiro").get("id"), parceiroId);
    }

    public static Specification<Conta> valorMinimo(BigDecimal min) {
        return (r, q, cb) -> cb.greaterThanOrEqualTo(r.get("valorOriginal"), min);
    }

    public static Specification<Conta> valorMaximo(BigDecimal max) {
        return (r, q, cb) -> cb.lessThanOrEqualTo(r.get("valorOriginal"), max);
    }

    public static Specification<Conta> categoriaId(Long categoriaId) {
        return (r, q, cb) -> cb.equal(r.get("categoria").get("id"), categoriaId);
    }
}
