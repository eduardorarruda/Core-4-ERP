package br.com.core4erp.chat.tools.gestao;

import br.com.core4erp.assinatura.dto.AssinaturaRequestDto;
import br.com.core4erp.assinatura.dto.AssinaturaResponseDto;
import br.com.core4erp.assinatura.service.AssinaturaService;
import br.com.core4erp.cartaoCredito.dto.CartaoCreditoRequestDto;
import br.com.core4erp.cartaoCredito.dto.CartaoCreditoResponseDto;
import br.com.core4erp.cartaoCredito.dto.LancamentoRequestDto;
import br.com.core4erp.cartaoCredito.dto.LancamentoResponseDto;
import br.com.core4erp.cartaoCredito.enums.TipoLancamentoCartao;
import br.com.core4erp.cartaoCredito.service.CartaoCreditoService;
import br.com.core4erp.chat.service.ChatAuditoriaService;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.contaCorrente.dto.ContaCorrenteRequestDto;
import br.com.core4erp.contaCorrente.dto.ContaCorrenteResponseDto;
import br.com.core4erp.contaCorrente.service.ContaCorrenteService;
import jakarta.persistence.EntityNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Ferramentas de GESTÃO (criar/editar/excluir) de estruturas financeiras pelo chat IA:
 * conta corrente, cartão de crédito, lançamentos do cartão e assinaturas.
 *
 * <p>As regras de negócio são garantidas pelos próprios serviços de domínio (ex.: não excluir
 * conta corrente com dependências, não editar lançamento de fatura fechada, saldo não é
 * sobrescrito num update). A autorização (@Requer) está nos serviços. As tools apenas montam o
 * DTO e delegam; updates fazem leitura+merge para permitir edição PARCIAL (só o que mudou).
 */
@Slf4j
@Component
public class GestaoFinanceiraTools {

    private final ContaCorrenteService contaCorrenteService;
    private final CartaoCreditoService cartaoCreditoService;
    private final AssinaturaService assinaturaService;
    private final SecurityContextUtils securityCtx;
    private final ChatAuditoriaService auditoria;

    public GestaoFinanceiraTools(ContaCorrenteService contaCorrenteService,
                                 CartaoCreditoService cartaoCreditoService,
                                 AssinaturaService assinaturaService,
                                 SecurityContextUtils securityCtx,
                                 ChatAuditoriaService auditoria) {
        this.contaCorrenteService = contaCorrenteService;
        this.cartaoCreditoService = cartaoCreditoService;
        this.assinaturaService = assinaturaService;
        this.securityCtx = securityCtx;
        this.auditoria = auditoria;
    }

    // ── Conta corrente ────────────────────────────────────────────────────────

    @Tool(description = """
            Cadastra uma conta corrente (conta bancária). Confirme os dados antes de executar.
            """)
    public ContaCorrenteResponseDto registrarContaCorrente(
            @ToolParam(description = "Número da conta") String numeroConta,
            @ToolParam(description = "Agência") String agencia,
            @ToolParam(description = "Descrição/apelido da conta. Ex: 'Nubank', 'Conta Itaú'") String descricao,
            @ToolParam(description = "Saldo inicial em reais. Padrão 0") BigDecimal saldoInicial,
            @ToolParam(description = "Data do saldo inicial (YYYY-MM-DD). Padrão: hoje") LocalDate dataSaldoInicial,
            @ToolParam(description = "Permitir saldo negativo? Padrão false") Boolean permitirSaldoNegativo) {
        audit("registrarContaCorrente", "descricao=" + descricao);
        ContaCorrenteRequestDto dto = new ContaCorrenteRequestDto(
                numeroConta, agencia, descricao,
                saldoInicial != null ? saldoInicial : BigDecimal.ZERO,
                dataSaldoInicial != null ? dataSaldoInicial : LocalDate.now(),
                Boolean.TRUE.equals(permitirSaldoNegativo));
        return contaCorrenteService.criar(dto);
    }

    @Tool(description = """
            Edita uma conta corrente existente. Informe apenas os campos a alterar (os demais são
            mantidos). Use consultarContasCorrentes para obter o ID. O saldo NÃO é editável aqui
            (é calculado por lançamentos/transferências). Confirme antes de executar.
            """)
    public ContaCorrenteResponseDto atualizarContaCorrente(
            @ToolParam(description = "ID da conta corrente") Long contaCorrenteId,
            @ToolParam(description = "Novo número da conta (opcional)") String numeroConta,
            @ToolParam(description = "Nova agência (opcional)") String agencia,
            @ToolParam(description = "Nova descrição (opcional)") String descricao,
            @ToolParam(description = "Permitir saldo negativo (opcional)") Boolean permitirSaldoNegativo) {
        audit("atualizarContaCorrente", "id=" + contaCorrenteId);
        ContaCorrenteResponseDto atual = contaCorrenteService.buscarPorId(contaCorrenteId);
        ContaCorrenteRequestDto dto = new ContaCorrenteRequestDto(
                numeroConta != null ? numeroConta : atual.numeroConta(),
                agencia != null ? agencia : atual.agencia(),
                descricao != null ? descricao : atual.descricao(),
                atual.saldo(),               // ignorado pelo service (campo calculado)
                atual.dataSaldoInicial(),
                permitirSaldoNegativo != null ? permitirSaldoNegativo : atual.permitirSaldoNegativo());
        return contaCorrenteService.atualizar(contaCorrenteId, dto);
    }

    @Tool(description = """
            Exclui uma conta corrente. Bloqueado se houver transferências, baixas, conciliações ou
            cartão vinculados a ela. Confirme com o usuário antes de executar.
            """)
    public String excluirContaCorrente(
            @ToolParam(description = "ID da conta corrente a excluir") Long contaCorrenteId) {
        audit("excluirContaCorrente", "id=" + contaCorrenteId);
        contaCorrenteService.deletar(contaCorrenteId);
        return "Conta corrente excluída com sucesso.";
    }

    // ── Cartão de crédito ─────────────────────────────────────────────────────

    @Tool(description = """
            Cadastra um cartão de crédito. Precisa de uma conta corrente vinculada
            (use consultarContasCorrentes para o ID). Confirme os dados antes de executar.
            """)
    public CartaoCreditoResponseDto registrarCartaoCredito(
            @ToolParam(description = "Nome do cartão. Ex: 'Nubank Roxinho'") String nome,
            @ToolParam(description = "Limite total em reais") BigDecimal limite,
            @ToolParam(description = "Dia de fechamento da fatura (1 a 31)") Integer diaFechamento,
            @ToolParam(description = "Dia de vencimento da fatura (1 a 31)") Integer diaVencimento,
            @ToolParam(description = "ID da conta corrente vinculada") Long contaCorrenteId) {
        audit("registrarCartaoCredito", "nome=" + nome);
        // Idempotência: se já existe cartão com o mesmo nome, reaproveita (evita duplicata da IA).
        CartaoCreditoResponseDto existente = cartaoCreditoService.listar(PageRequest.of(0, 200))
                .getContent().stream()
                .filter(c -> c.nome() != null && c.nome().equalsIgnoreCase(nome.strip()))
                .findFirst().orElse(null);
        if (existente != null) return existente;
        CartaoCreditoRequestDto dto = new CartaoCreditoRequestDto(
                nome, limite, diaFechamento, diaVencimento, contaCorrenteId);
        return cartaoCreditoService.criar(dto);
    }

    @Tool(description = """
            Edita um cartão de crédito. Informe apenas os campos a alterar. Use consultarCartoes
            para o ID. Confirme antes de executar.
            """)
    public CartaoCreditoResponseDto atualizarCartaoCredito(
            @ToolParam(description = "ID do cartão") Long cartaoId,
            @ToolParam(description = "Novo nome (opcional)") String nome,
            @ToolParam(description = "Novo limite (opcional)") BigDecimal limite,
            @ToolParam(description = "Novo dia de fechamento 1-31 (opcional)") Integer diaFechamento,
            @ToolParam(description = "Novo dia de vencimento 1-31 (opcional)") Integer diaVencimento,
            @ToolParam(description = "Nova conta corrente vinculada (opcional)") Long contaCorrenteId) {
        audit("atualizarCartaoCredito", "id=" + cartaoId);
        CartaoCreditoResponseDto atual = cartaoCreditoService.buscarPorId(cartaoId);
        CartaoCreditoRequestDto dto = new CartaoCreditoRequestDto(
                nome != null ? nome : atual.nome(),
                limite != null ? limite : atual.limite(),
                diaFechamento != null ? diaFechamento : atual.diaFechamento(),
                diaVencimento != null ? diaVencimento : atual.diaVencimento(),
                contaCorrenteId != null ? contaCorrenteId : atual.contaCorrenteId());
        return cartaoCreditoService.atualizar(cartaoId, dto);
    }

    @Tool(description = """
            Exclui um cartão de crédito. Bloqueado se houver lançamentos associados. Confirme antes.
            """)
    public String excluirCartaoCredito(
            @ToolParam(description = "ID do cartão a excluir") Long cartaoId) {
        audit("excluirCartaoCredito", "id=" + cartaoId);
        cartaoCreditoService.deletar(cartaoId);
        return "Cartão de crédito excluído com sucesso.";
    }

    // ── Lançamentos do cartão (edição/exclusão) ───────────────────────────────

    @Tool(description = """
            Lista os lançamentos de um cartão (id, descrição, valor, data, fatura, categoria).
            Use para obter o ID do lançamento antes de editar ou excluir.
            """)
    public List<LancamentoResponseDto> consultarLancamentosCartao(
            @ToolParam(description = "ID do cartão") Long cartaoId,
            @ToolParam(description = "Mês da fatura (opcional)") Integer mes,
            @ToolParam(description = "Ano da fatura (opcional)") Integer ano) {
        return cartaoCreditoService.listarLancamentos(cartaoId, mes, ano, null);
    }

    @Tool(description = """
            Edita um lançamento de cartão. Informe apenas o que mudar. BLOQUEADO se a fatura desse
            lançamento já estiver fechada (nesse caso é preciso reabrir/estornar antes). Use
            consultarLancamentosCartao para os IDs. Confirme antes de executar.
            """)
    public LancamentoResponseDto atualizarLancamentoCartao(
            @ToolParam(description = "ID do cartão") Long cartaoId,
            @ToolParam(description = "ID do lançamento") Long lancamentoId,
            @ToolParam(description = "Nova descrição (opcional)") String descricao,
            @ToolParam(description = "Novo valor em reais (opcional)") BigDecimal valor,
            @ToolParam(description = "Nova data da compra YYYY-MM-DD (opcional)") LocalDate dataCompra,
            @ToolParam(description = "Nova categoria (opcional)") Long categoriaId,
            @ToolParam(description = "Novo parceiro (opcional)") Long parceiroId,
            @ToolParam(description = "Tipo: SAIDA ou ENTRADA (opcional)") String tipo) {
        audit("atualizarLancamentoCartao", "cartaoId=" + cartaoId + " lancamentoId=" + lancamentoId);
        LancamentoResponseDto atual = cartaoCreditoService.listarLancamentos(cartaoId, null, null, null)
                .stream().filter(l -> l.id().equals(lancamentoId)).findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Lançamento não encontrado: " + lancamentoId));
        TipoLancamentoCartao tipoEnum = atual.tipo();
        if (tipo != null && !tipo.isBlank()) {
            try {
                tipoEnum = TipoLancamentoCartao.valueOf(tipo.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Tipo inválido: '" + tipo + "'. Use SAIDA ou ENTRADA.");
            }
        }
        LancamentoRequestDto dto = new LancamentoRequestDto(
                descricao != null ? descricao : atual.descricao(),
                valor != null ? valor : atual.valor(),
                dataCompra != null ? dataCompra : atual.dataCompra(),
                categoriaId != null ? categoriaId : atual.categoriaId(),
                parceiroId != null ? parceiroId : atual.parceiroId(),
                1, false, tipoEnum);
        return cartaoCreditoService.atualizarLancamento(cartaoId, lancamentoId, dto);
    }

    @Tool(description = """
            Exclui um lançamento de cartão. BLOQUEADO se a fatura já estiver fechada. Use
            consultarLancamentosCartao para os IDs. Confirme antes de executar.
            """)
    public String excluirLancamentoCartao(
            @ToolParam(description = "ID do cartão") Long cartaoId,
            @ToolParam(description = "ID do lançamento a excluir") Long lancamentoId) {
        audit("excluirLancamentoCartao", "cartaoId=" + cartaoId + " lancamentoId=" + lancamentoId);
        cartaoCreditoService.deletarLancamento(cartaoId, lancamentoId);
        return "Lançamento excluído com sucesso.";
    }

    // ── Assinaturas ───────────────────────────────────────────────────────────

    @Tool(description = """
            Cadastra uma assinatura/recorrência (ex.: Netflix, Spotify). Pode ser vinculada a um
            cartão (consultarCartoes) e a um parceiro (consultarParceiros). categoriaId é
            obrigatório. Confirme antes de executar.
            """)
    public AssinaturaResponseDto registrarAssinatura(
            @ToolParam(description = "Descrição. Ex: 'Netflix'") String descricao,
            @ToolParam(description = "Valor mensal em reais") BigDecimal valor,
            @ToolParam(description = "Dia de vencimento (1 a 31)") Integer diaVencimento,
            @ToolParam(description = "ID da categoria") Long categoriaId,
            @ToolParam(description = "ID do parceiro (opcional)") Long parceiroId,
            @ToolParam(description = "ID do cartão de crédito para cobrança (opcional)") Long cartaoCreditoId,
            @ToolParam(description = "Ativa? Padrão true") Boolean ativa) {
        audit("registrarAssinatura", "descricao=" + descricao);
        // Idempotência: se já existe assinatura com a mesma descrição, reaproveita (evita duplicata).
        AssinaturaResponseDto existente = assinaturaService.listar().stream()
                .filter(a -> a.descricao() != null && a.descricao().equalsIgnoreCase(descricao.strip()))
                .findFirst().orElse(null);
        if (existente != null) return existente;
        AssinaturaRequestDto dto = new AssinaturaRequestDto(
                descricao, valor, diaVencimento, ativa, categoriaId, parceiroId, cartaoCreditoId);
        return assinaturaService.criar(dto);
    }

    @Tool(description = """
            Edita uma assinatura. Informe apenas o que mudar. Use consultarAssinaturas para o ID.
            Para pausar/reativar, ajuste 'ativa'. Confirme antes de executar.
            """)
    public AssinaturaResponseDto atualizarAssinatura(
            @ToolParam(description = "ID da assinatura") Long assinaturaId,
            @ToolParam(description = "Nova descrição (opcional)") String descricao,
            @ToolParam(description = "Novo valor (opcional)") BigDecimal valor,
            @ToolParam(description = "Novo dia de vencimento 1-31 (opcional)") Integer diaVencimento,
            @ToolParam(description = "Nova categoria (opcional)") Long categoriaId,
            @ToolParam(description = "Novo parceiro (opcional)") Long parceiroId,
            @ToolParam(description = "Novo cartão (opcional)") Long cartaoCreditoId,
            @ToolParam(description = "Ativa? true/false (opcional)") Boolean ativa) {
        audit("atualizarAssinatura", "id=" + assinaturaId);
        AssinaturaResponseDto atual = assinaturaService.buscarPorId(assinaturaId);
        AssinaturaRequestDto dto = new AssinaturaRequestDto(
                descricao != null ? descricao : atual.descricao(),
                valor != null ? valor : atual.valor(),
                diaVencimento != null ? diaVencimento : atual.diaVencimento(),
                ativa != null ? ativa : atual.ativa(),
                categoriaId != null ? categoriaId : atual.categoriaId(),
                parceiroId != null ? parceiroId : atual.parceiroId(),
                cartaoCreditoId != null ? cartaoCreditoId : atual.cartaoCreditoId());
        return assinaturaService.atualizar(assinaturaId, dto);
    }

    @Tool(description = "Exclui uma assinatura. Use consultarAssinaturas para o ID. Confirme antes.")
    public String excluirAssinatura(
            @ToolParam(description = "ID da assinatura a excluir") Long assinaturaId) {
        audit("excluirAssinatura", "id=" + assinaturaId);
        assinaturaService.deletar(assinaturaId);
        return "Assinatura excluída com sucesso.";
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private void audit(String ferramenta, String detalhe) {
        log.info("[CHAT-AUDIT] user={} tool={} {}", securityCtx.getUsuarioId(), ferramenta, detalhe);
        auditoria.registrar(ferramenta, detalhe);
    }
}
