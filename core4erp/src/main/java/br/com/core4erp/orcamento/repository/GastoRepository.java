package br.com.core4erp.orcamento.repository;

import br.com.core4erp.orcamento.entity.Orcamento;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Agregações de GASTO (despesa) usadas por Orçamento e Insights. Todas as consultas partem da
 * mesma CTE {@link #CTE_GASTO}, então "gasto" significa exatamente a mesma coisa nas duas telas.
 *
 * <h2>Definição de gasto (regime de competência do consumo)</h2>
 * <ul>
 *   <li><b>Contas a pagar</b> ({@code tipo = PAGAR}, status PENDENTE/ATRASADO/PAGO) pela
 *       {@code data_vencimento} — mesmo critério do card "despesas por categoria" do Dashboard
 *       ({@code ContaRepository.despesasPorCategoria}).</li>
 *   <li><b>Exceto</b> as contas geradas pelo fechamento de fatura de cartão
 *       ({@code tb_fatura_cartao.conta_id}): elas agregam a fatura inteira sob a categoria do
 *       1º lançamento e duplicariam os lançamentos de cartão abaixo.</li>
 *   <li><b>Lançamentos de cartão</b>: SAIDA − ENTRADA (estorno abate), na data da compra. Parcela
 *       k &gt; 1 de um parcelamento conta no dia 1 do k-ésimo mês a partir da compra (cada parcela
 *       pesa no mês dela, não a compra inteira no mês da compra).</li>
 *   <li><b>Roll-up</b>: subcategoria soma na categoria-pai via {@code COALESCE(categoria_pai_id, id)}.</li>
 * </ul>
 * Toda consulta é filtrada por {@code empresa_id} (multi-tenancy) e por intervalo de datas.
 */
public interface GastoRepository extends Repository<Orcamento, Long> {

    /** Parâmetros: {@code :eid}, {@code :inicio}, {@code :fim} (datas inclusivas). */
    String CTE_GASTO = """
        WITH gasto AS (
            SELECT COALESCE(cat.categoria_pai_id, cat.id) AS categoria_id,
                   c.valor_original                       AS valor,
                   c.data_vencimento                      AS data,
                   c.descricao                            AS descricao,
                   c.parceiro_id                          AS parceiro_id,
                   'CONTA'                                AS origem
            FROM tb_conta c
            JOIN tb_categoria cat ON cat.id = c.categoria_id
            WHERE c.empresa_id = :eid
              AND c.tipo = 'PAGAR'
              AND c.status IN ('PENDENTE', 'ATRASADO', 'PAGO')
              AND c.data_vencimento BETWEEN :inicio AND :fim
              AND NOT EXISTS (SELECT 1 FROM tb_fatura_cartao f WHERE f.conta_id = c.id)
            UNION ALL
            SELECT COALESCE(cat.categoria_pai_id, cat.id),
                   CASE WHEN l.tipo = 'ENTRADA' THEN -l.valor ELSE l.valor END,
                   ref.data,
                   l.descricao,
                   l.parceiro_id,
                   'CARTAO'
            FROM tb_lancamento_cartao l
            CROSS JOIN LATERAL (
                SELECT CASE WHEN l.numero_parcela > 1
                            THEN CAST(date_trunc('month', l.data_compra)
                                      + make_interval(months => l.numero_parcela - 1) AS date)
                            ELSE l.data_compra
                       END AS data
            ) ref
            JOIN tb_categoria cat ON cat.id = l.categoria_id
            WHERE l.empresa_id = :eid
              AND l.data_compra <= :fim
              AND ref.data BETWEEN :inicio AND :fim
        )
        """;

    // ── Consultas brutas (Object[]) — mapeadas pelos métodos default abaixo ──────

    @Query(value = CTE_GASTO + """
        SELECT g.categoria_id,
               cat.descricao,
               cat.icone,
               CAST(EXTRACT(YEAR  FROM g.data) AS integer),
               CAST(EXTRACT(MONTH FROM g.data) AS integer),
               SUM(g.valor),
               SUM(CASE WHEN g.data <= :ate THEN g.valor ELSE 0 END),
               SUM(CASE WHEN g.data <= :ate AND g.origem = 'CARTAO' THEN g.valor ELSE 0 END)
        FROM gasto g
        JOIN tb_categoria cat ON cat.id = g.categoria_id
        GROUP BY g.categoria_id, cat.descricao, cat.icone,
                 CAST(EXTRACT(YEAR FROM g.data) AS integer), CAST(EXTRACT(MONTH FROM g.data) AS integer)
        """, nativeQuery = true)
    List<Object[]> gastoMensalPorCategoriaBruto(@Param("eid") Long eid,
                                                @Param("inicio") LocalDate inicio,
                                                @Param("fim") LocalDate fim,
                                                @Param("ate") LocalDate ate);

    @Query(value = CTE_GASTO + """
        SELECT g.data,
               SUM(g.valor),
               SUM(CASE WHEN g.valor > 0 THEN 1 ELSE 0 END),
               SUM(CASE WHEN g.origem = 'CARTAO' THEN g.valor ELSE 0 END)
        FROM gasto g
        GROUP BY g.data
        ORDER BY g.data
        """, nativeQuery = true)
    List<Object[]> gastoDiarioBruto(@Param("eid") Long eid,
                                    @Param("inicio") LocalDate inicio,
                                    @Param("fim") LocalDate fim);

    @Query(value = CTE_GASTO + """
        SELECT g.descricao,
               g.valor,
               g.data,
               g.origem,
               cat.descricao,
               COALESCE(p.nome_fantasia, p.razao_social)
        FROM gasto g
        JOIN tb_categoria cat ON cat.id = g.categoria_id
        LEFT JOIN tb_parceiro p ON p.id = g.parceiro_id
        WHERE g.valor > 0
        ORDER BY g.valor DESC, g.data DESC
        LIMIT :limite
        """, nativeQuery = true)
    List<Object[]> maioresGastosBruto(@Param("eid") Long eid,
                                      @Param("inicio") LocalDate inicio,
                                      @Param("fim") LocalDate fim,
                                      @Param("limite") int limite);

    // ── API tipada ────────────────────────────────────────────────────────────

    /**
     * Gasto por categoria-raiz e mês. {@code totalAte} = parte com data &lt;= {@code ate} (o "realizado até
     * hoje" — contas com vencimento futuro no mês ficam de fora dele, mas entram em {@code total});
     * {@code cartaoAte} = só a parte de cartão até a data (gasto variável, base do ritmo da projeção).
     */
    default List<GastoCategoriaMes> gastoMensalPorCategoria(Long eid, LocalDate inicio, LocalDate fim, LocalDate ate) {
        return gastoMensalPorCategoriaBruto(eid, inicio, fim, ate).stream().map(GastoCategoriaMes::de).toList();
    }

    default List<GastoDiario> gastoDiario(Long eid, LocalDate inicio, LocalDate fim) {
        return gastoDiarioBruto(eid, inicio, fim).stream().map(GastoDiario::de).toList();
    }

    default List<GastoIndividual> maioresGastos(Long eid, LocalDate inicio, LocalDate fim, int limite) {
        return maioresGastosBruto(eid, inicio, fim, limite).stream().map(GastoIndividual::de).toList();
    }

    /**
     * Gasto de uma categoria-raiz (já com roll-up) em um mês; {@code totalAte}/{@code cartaoAte} = parte
     * (total / só cartão) até a data de corte.
     */
    record GastoCategoriaMes(Long categoriaId, String descricao, String icone, int ano, int mes,
                             BigDecimal total, BigDecimal totalAte, BigDecimal cartaoAte) {
        static GastoCategoriaMes de(Object[] r) {
            return new GastoCategoriaMes(ConversorLinha.longo(r[0]), (String) r[1], (String) r[2],
                    ConversorLinha.inteiro(r[3]), ConversorLinha.inteiro(r[4]),
                    ConversorLinha.decimal(r[5]), ConversorLinha.decimal(r[6]), ConversorLinha.decimal(r[7]));
        }
    }

    /**
     * Gasto líquido de um dia, quantidade de lançamentos positivos (compras/contas) e a parte que veio
     * do cartão (gasto "variável", usado no ritmo da projeção — contas a pagar já são conhecidas pelo vencimento).
     */
    record GastoDiario(LocalDate data, BigDecimal total, long quantidade, BigDecimal totalCartao) {
        static GastoDiario de(Object[] r) {
            return new GastoDiario(ConversorLinha.data(r[0]), ConversorLinha.decimal(r[1]),
                    ConversorLinha.longo(r[2]), ConversorLinha.decimal(r[3]));
        }
    }

    /** Um gasto individual (conta a pagar ou lançamento/parcela de cartão). */
    record GastoIndividual(String descricao, BigDecimal valor, LocalDate data, String origem,
                           String categoria, String parceiro) {
        static GastoIndividual de(Object[] r) {
            return new GastoIndividual((String) r[0], ConversorLinha.decimal(r[1]), ConversorLinha.data(r[2]),
                    (String) r[3], (String) r[4], (String) r[5]);
        }
    }
}
