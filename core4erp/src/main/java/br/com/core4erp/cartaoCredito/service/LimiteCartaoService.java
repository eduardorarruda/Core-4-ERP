package br.com.core4erp.cartaoCredito.service;

import br.com.core4erp.cartaoCredito.repository.LancamentoCartaoRepository;
import br.com.core4erp.cartaoCredito.repository.SaldoFaturaCartaoLinha;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Fonte única do LIMITE USADO de cartão de crédito (§17 do CLAUDE.md), como num cartão real:
 * <pre>limite_usado = max(0, Σ SAIDA − Σ ENTRADA de todas as faturas NÃO pagas do cartão)</pre>
 * "Não paga" = fatura aberta, fechada com a conta ainda pendente, ou futura (inclui as parcelas
 * 2..n de compras parceladas — o limite é comprometido inteiro na compra). Fatura paga (conta do
 * fechamento com status PAGO) libera o limite. O piso em zero é por cartão: crédito sobrando num
 * cartão não libera limite de outro.
 *
 * <p>Uma consulta agregada por tenant ({@link LancamentoCartaoRepository#saldosPorFaturaDoCartao});
 * usado na listagem/detalhe de cartões (e na tool do chat, que reaproveita a listagem) e no
 * Dashboard. Sem N+1.
 */
@Service
public class LimiteCartaoService {

    private final LancamentoCartaoRepository lancamentoRepo;

    public LimiteCartaoService(LancamentoCartaoRepository lancamentoRepo) {
        this.lancamentoRepo = lancamentoRepo;
    }

    /** Limite usado de cada cartão do tenant que tem lançamentos (ausente no mapa = zero). */
    @Transactional(readOnly = true)
    public Map<Long, BigDecimal> limiteUsadoPorCartao(Long empresaId) {
        return calcular(lancamentoRepo.saldosPorFaturaDoCartao(empresaId));
    }

    /** Limite usado de um cartão (já validado como do tenant pelo chamador). */
    @Transactional(readOnly = true)
    public BigDecimal limiteUsado(Long empresaId, Long cartaoId) {
        return limiteUsadoPorCartao(empresaId).getOrDefault(cartaoId, BigDecimal.ZERO);
    }

    /** Soma do limite usado de todos os cartões do tenant (cada um já com piso em zero). */
    @Transactional(readOnly = true)
    public BigDecimal limiteUsadoTotal(Long empresaId) {
        return limiteUsadoPorCartao(empresaId).values().stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** Regra pura: soma por cartão as faturas não pagas e aplica o piso em zero. */
    static Map<Long, BigDecimal> calcular(List<SaldoFaturaCartaoLinha> linhas) {
        if (linhas == null || linhas.isEmpty()) return Collections.emptyMap();
        Map<Long, BigDecimal> somas = new HashMap<>();
        for (SaldoFaturaCartaoLinha linha : linhas) {
            if (Boolean.TRUE.equals(linha.paga()) || linha.liquido() == null) continue;
            somas.merge(linha.cartaoId(), linha.liquido(), BigDecimal::add);
        }
        Map<Long, BigDecimal> resultado = new HashMap<>();
        somas.forEach((cartaoId, soma) -> resultado.put(cartaoId, soma.max(BigDecimal.ZERO)));
        return Collections.unmodifiableMap(resultado);
    }
}
