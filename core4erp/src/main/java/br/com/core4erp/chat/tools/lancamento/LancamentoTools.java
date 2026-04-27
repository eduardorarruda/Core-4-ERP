package br.com.core4erp.chat.tools.lancamento;

import br.com.core4erp.cartaoCredito.dto.LancamentoRequestDto;
import br.com.core4erp.cartaoCredito.dto.LancamentoResponseDto;
import br.com.core4erp.cartaoCredito.service.CartaoCreditoService;
import br.com.core4erp.conta.dto.BaixaRequestDto;
import br.com.core4erp.conta.dto.ContaCreateDto;
import br.com.core4erp.conta.dto.ContaResponseDto;
import br.com.core4erp.conta.service.ContaService;
import br.com.core4erp.contaCorrente.dto.TransferenciaRequestDto;
import br.com.core4erp.contaCorrente.service.ContaCorrenteService;
import br.com.core4erp.enums.TipoConta;
import br.com.core4erp.enums.TipoTransacaoInvestimento;
import br.com.core4erp.investimento.dto.TransacaoInvestimentoRequestDto;
import br.com.core4erp.investimento.dto.TransacaoInvestimentoResponseDto;
import br.com.core4erp.investimento.service.InvestimentoService;
import br.com.core4erp.config.security.SecurityContextUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
public class LancamentoTools {

    private final ContaService contaService;
    private final ContaCorrenteService contaCorrenteService;
    private final CartaoCreditoService cartaoCreditoService;
    private final InvestimentoService investimentoService;
    private final SecurityContextUtils securityCtx;

    public LancamentoTools(ContaService contaService,
                           ContaCorrenteService contaCorrenteService,
                           CartaoCreditoService cartaoCreditoService,
                           InvestimentoService investimentoService,
                           SecurityContextUtils securityCtx) {
        this.contaService = contaService;
        this.contaCorrenteService = contaCorrenteService;
        this.cartaoCreditoService = cartaoCreditoService;
        this.investimentoService = investimentoService;
        this.securityCtx = securityCtx;
    }

    @Tool(description = """
            Registra uma nova conta a pagar ou a receber.
            ANTES de chamar, o assistente DEVE ter confirmado os dados com o usuário.
            Se não souber o categoriaId, use consultarCategorias primeiro.
            Retorna a lista de contas criadas (pode ser mais de uma se parcelado).
            """)
    public List<ContaResponseDto> registrarConta(
            @ToolParam(description = "Descrição da conta. Ex: 'Conta de Luz', 'Salário'") String descricao,
            @ToolParam(description = "Valor em reais. Ex: 250.00") BigDecimal valorOriginal,
            @ToolParam(description = "Data de vencimento no formato YYYY-MM-DD") LocalDate dataVencimento,
            @ToolParam(description = "PAGAR para despesas, RECEBER para receitas") String tipo,
            @ToolParam(description = "ID da categoria. Use consultarCategorias para descobrir o ID correto") Long categoriaId,
            @ToolParam(description = "ID do parceiro/fornecedor. Opcional, pode ser null") Long parceiroId,
            @ToolParam(description = "Número de parcelas. Padrão: 1") Integer quantidadeParcelas,
            @ToolParam(description = "Se true, divide o valor total entre as parcelas") Boolean dividirValor) {
        log.info("[CHAT-AUDIT] user={} tool=registrarConta descricao={} valor={} tipo={}",
                securityCtx.getEmail(), descricao, valorOriginal, tipo);
        TipoConta tipoConta;
        try {
            tipoConta = TipoConta.valueOf(tipo.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Tipo de conta inválido: '" + tipo + "'. Use PAGAR ou RECEBER.");
        }
        ContaCreateDto dto = new ContaCreateDto(
                descricao,
                valorOriginal,
                dataVencimento,
                tipoConta,
                categoriaId,
                parceiroId,
                quantidadeParcelas != null ? quantidadeParcelas : 1,
                1,
                Boolean.TRUE.equals(dividirValor),
                null, null, null
        );
        return contaService.criar(dto);
    }

    @Tool(description = """
            Registra um lançamento em cartão de crédito. Suporta parcelamento.
            Use consultarCartoes para obter o cartaoId e consultarCategorias
            para o categoriaId. CONFIRME os dados antes de executar.
            """)
    public List<LancamentoResponseDto> registrarLancamentoCartao(
            @ToolParam(description = "ID do cartão de crédito. Use consultarCartoes para descobrir") Long cartaoId,
            @ToolParam(description = "Descrição da compra") String descricao,
            @ToolParam(description = "Valor da compra em reais") BigDecimal valor,
            @ToolParam(description = "Data da compra no formato YYYY-MM-DD") LocalDate dataCompra,
            @ToolParam(description = "Mês da fatura (1-12)") Integer mesFatura,
            @ToolParam(description = "Ano da fatura. Ex: 2026") Integer anoFatura,
            @ToolParam(description = "ID da categoria") Long categoriaId,
            @ToolParam(description = "Número de parcelas. Padrão: 1") Integer quantidadeParcelas) {
        log.info("[CHAT-AUDIT] user={} tool=registrarLancamentoCartao cartaoId={} descricao={} valor={}",
                securityCtx.getEmail(), cartaoId, descricao, valor);
        LancamentoRequestDto dto = new LancamentoRequestDto(
                descricao,
                valor,
                dataCompra,
                mesFatura,
                anoFatura,
                categoriaId,
                quantidadeParcelas != null ? quantidadeParcelas : 1,
                true
        );
        return cartaoCreditoService.criarLancamento(cartaoId, dto);
    }

    @Tool(description = """
            Transfere um valor entre duas contas correntes do usuário.
            Use consultarContasCorrentes para obter os IDs das contas.
            """)
    public Map<String, String> transferirEntreContas(
            @ToolParam(description = "ID da conta corrente de origem") Long contaOrigemId,
            @ToolParam(description = "ID da conta corrente de destino") Long contaDestinoId,
            @ToolParam(description = "Valor a transferir em reais") BigDecimal valor) {
        log.info("[CHAT-AUDIT] user={} tool=transferirEntreContas origem={} destino={} valor={}",
                securityCtx.getEmail(), contaOrigemId, contaDestinoId, valor);
        TransferenciaRequestDto dto = new TransferenciaRequestDto(contaOrigemId, contaDestinoId, valor);
        contaCorrenteService.transferir(dto);
        return Map.of("status", "Transferência realizada com sucesso");
    }

    @Tool(description = """
            Registra o pagamento (baixa) de uma conta a pagar ou o recebimento
            de uma conta a receber. Move o saldo da conta corrente informada.
            """)
    public ContaResponseDto baixarConta(
            @ToolParam(description = "ID da conta a ser baixada") Long contaId,
            @ToolParam(description = "ID da conta corrente para débito/crédito") Long contaCorrenteId,
            @ToolParam(description = "Data do pagamento/recebimento no formato YYYY-MM-DD") LocalDate dataPagamento,
            @ToolParam(description = "Valor de juros. Padrão: 0") BigDecimal juros,
            @ToolParam(description = "Valor de multa. Padrão: 0") BigDecimal multa) {
        log.info("[CHAT-AUDIT] user={} tool=baixarConta contaId={} contaCorrenteId={} data={}",
                securityCtx.getEmail(), contaId, contaCorrenteId, dataPagamento);
        BaixaRequestDto dto = new BaixaRequestDto(
                contaCorrenteId,
                dataPagamento,
                juros != null ? juros : BigDecimal.ZERO,
                multa != null ? multa : BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO
        );
        return contaService.baixar(contaId, dto);
    }

    @Tool(description = """
            Registra uma transação em conta de investimento:
            APORTE (adiciona), RESGATE (retira) ou RENDIMENTO (rendimento creditado).
            Se for APORTE, pode debitar de uma conta corrente.
            """)
    public TransacaoInvestimentoResponseDto registrarTransacaoInvestimento(
            @ToolParam(description = "ID da conta de investimento") Long contaInvestimentoId,
            @ToolParam(description = "APORTE, RESGATE ou RENDIMENTO") String tipoTransacao,
            @ToolParam(description = "Valor da transação em reais") BigDecimal valor,
            @ToolParam(description = "Data da transação no formato YYYY-MM-DD") LocalDate dataTransacao,
            @ToolParam(description = "ID da conta corrente para débito (apenas para APORTE). Opcional") Long contaCorrenteOrigemId) {
        log.info("[CHAT-AUDIT] user={} tool=registrarTransacaoInvestimento contaId={} tipo={} valor={}",
                securityCtx.getEmail(), contaInvestimentoId, tipoTransacao, valor);
        TipoTransacaoInvestimento tipoEnum;
        try {
            tipoEnum = TipoTransacaoInvestimento.valueOf(tipoTransacao.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Tipo de transação inválido: '" + tipoTransacao + "'. Use APORTE, RESGATE ou RENDIMENTO.");
        }
        TransacaoInvestimentoRequestDto dto = new TransacaoInvestimentoRequestDto(
                tipoEnum,
                valor,
                dataTransacao,
                contaCorrenteOrigemId
        );
        return investimentoService.registrarTransacao(contaInvestimentoId, dto);
    }
}
