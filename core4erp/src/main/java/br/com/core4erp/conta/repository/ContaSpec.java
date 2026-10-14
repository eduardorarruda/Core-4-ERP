package br.com.core4erp.conta.repository;

import br.com.core4erp.conta.entity.Conta;
import br.com.core4erp.enums.StatusConta;
import br.com.core4erp.enums.TipoConta;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Locale;

public final class ContaSpec {

    /** Tamanho máximo do termo de busca livre (o excedente é descartado). */
    public static final int BUSCA_MAX = 100;

    /** Caractere de escape usado nos LIKE de busca livre. */
    public static final char ESCAPE_LIKE = '\\';

    private ContaSpec() {}

    /**
     * Normaliza o termo de busca livre: {@code trim}, limita a {@link #BUSCA_MAX} caracteres e
     * devolve {@code null} quando vazio/branco (sem filtro).
     */
    public static String normalizarBusca(String busca) {
        if (busca == null) return null;
        String t = busca.trim();
        if (t.isEmpty()) return null;
        return t.length() > BUSCA_MAX ? t.substring(0, BUSCA_MAX) : t;
    }

    /** Escapa os curingas do LIKE ({@code \\}, {@code %}, {@code _}) para que o termo seja literal. */
    public static String escaparLike(String termo) {
        StringBuilder sb = new StringBuilder(termo.length() + 8);
        for (char c : termo.toCharArray()) {
            if (c == ESCAPE_LIKE || c == '%' || c == '_') sb.append(ESCAPE_LIKE);
            sb.append(c);
        }
        return sb.toString();
    }

    /** Padrão {@code %termo%} em minúsculas, com curingas do usuário escapados. */
    public static String padraoContem(String termo) {
        return "%" + escaparLike(termo.toLowerCase(Locale.ROOT)) + "%";
    }

    /**
     * Busca livre: descrição, razão social/nome fantasia do parceiro (LEFT JOIN — contas sem
     * parceiro continuam elegíveis) ou número do documento. Nenhuma dessas colunas é cifrada.
     * O termo deve vir já normalizado ({@link #normalizarBusca}).
     */
    public static Specification<Conta> busca(String termo) {
        String padrao = padraoContem(termo);
        return (r, q, cb) -> {
            var parceiro = r.join("parceiro", JoinType.LEFT);
            return cb.or(
                    cb.like(cb.lower(r.get("descricao")), padrao, ESCAPE_LIKE),
                    cb.like(cb.lower(parceiro.get("razaoSocial")), padrao, ESCAPE_LIKE),
                    cb.like(cb.lower(parceiro.get("nomeFantasia")), padrao, ESCAPE_LIKE),
                    cb.like(cb.lower(r.get("numeroDocumento")), padrao, ESCAPE_LIKE));
        };
    }

    public static Specification<Conta> empresaId(Long eid) {
        return (r, q, cb) -> cb.equal(r.get("empresaId"), eid);
    }

    public static Specification<Conta> tipo(TipoConta tipo) {
        return (r, q, cb) -> cb.equal(r.get("tipo"), tipo);
    }

    public static Specification<Conta> status(StatusConta status) {
        return (r, q, cb) -> cb.equal(r.get("status"), status);
    }

    public static Specification<Conta> numeroDocumentoContains(String term) {
        return (r, q, cb) -> cb.like(cb.lower(r.get("numeroDocumento")), padraoContem(term.trim()), ESCAPE_LIKE);
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

    /**
     * Filtra pela categoria informada OU por qualquer subcategoria dela — filtrar por uma
     * categoria principal traz também os lançamentos das suas subcategorias.
     */
    public static Specification<Conta> categoriaId(Long categoriaId) {
        return (r, q, cb) -> {
            var categoria = r.join("categoria");                          // inner: categoria é obrigatória
            var pai = categoria.join("categoriaPai", JoinType.LEFT);      // left: preserva categorias raiz
            return cb.or(
                    cb.equal(categoria.get("id"), categoriaId),
                    cb.equal(pai.get("id"), categoriaId));
        };
    }
}
