package br.com.core4erp.chat.tools.gestao;

import br.com.core4erp.assinatura.dto.AssinaturaRequestDto;
import br.com.core4erp.assinatura.dto.AssinaturaResponseDto;
import br.com.core4erp.assinatura.service.AssinaturaService;
import br.com.core4erp.cartaoCredito.dto.CartaoCreditoRequestDto;
import br.com.core4erp.cartaoCredito.dto.CartaoCreditoResponseDto;
import br.com.core4erp.cartaoCredito.dto.CartaoDashboardResumoDto;
import br.com.core4erp.cartaoCredito.dto.FechamentoFaturaRequestDto;
import br.com.core4erp.cartaoCredito.dto.LancamentoRequestDto;
import br.com.core4erp.cartaoCredito.dto.LancamentoResponseDto;
import br.com.core4erp.cartaoCredito.enums.TipoLancamentoCartao;
import br.com.core4erp.cartaoCredito.service.CartaoCreditoService;
import br.com.core4erp.categoria.dto.CategoriaRequestDto;
import br.com.core4erp.categoria.dto.CategoriaResponseDto;
import br.com.core4erp.categoria.service.CategoriaService;
import br.com.core4erp.chat.service.ChatAuditoriaService;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.conta.dto.ContaResponseDto;
import br.com.core4erp.conta.dto.GastoContaCorrenteDto;
import br.com.core4erp.conta.service.ContaService;
import br.com.core4erp.contaCorrente.dto.ContaCorrenteRequestDto;
import br.com.core4erp.contaCorrente.dto.ContaCorrenteResponseDto;
import br.com.core4erp.contaCorrente.service.ContaCorrenteService;
import br.com.core4erp.enums.TipoParceiro;
import br.com.core4erp.parceiro.dto.ParceiroRequestDto;
import br.com.core4erp.parceiro.dto.ParceiroResponseDto;
import br.com.core4erp.parceiro.service.ParceiroService;
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
 * <p><b>Identificação por NOME, não por ID.</b> Modelos de IA erram/inventam IDs numéricos
 * com facilidade. Por isso estas tools recebem o NOME (descrição) da entidade e resolvem o ID
 * internamente — se houver 0 ou mais de 1 com aquele nome, devolvem um erro claro pedindo
 * desambiguação, em vez de agir sobre o registro errado.
 *
 * <p>As regras de negócio são garantidas pelos serviços de domínio (não excluir com dependências,
 * não editar lançamento de fatura fechada, saldo não-sobrescrevível). A autorização (@Requer)
 * está nos serviços. Updates fazem leitura+merge para permitir edição PARCIAL.
 */
@Slf4j
@Component
public class GestaoFinanceiraTools {

    private final ContaCorrenteService contaCorrenteService;
    private final CartaoCreditoService cartaoCreditoService;
    private final AssinaturaService assinaturaService;
    private final CategoriaService categoriaService;
    private final ParceiroService parceiroService;
    private final ContaService contaService;
    private final SecurityContextUtils securityCtx;
    private final ChatAuditoriaService auditoria;

    public GestaoFinanceiraTools(ContaCorrenteService contaCorrenteService,
                                 CartaoCreditoService cartaoCreditoService,
                                 AssinaturaService assinaturaService,
                                 CategoriaService categoriaService,
                                 ParceiroService parceiroService,
                                 ContaService contaService,
                                 SecurityContextUtils securityCtx,
                                 ChatAuditoriaService auditoria) {
        this.contaCorrenteService = contaCorrenteService;
        this.cartaoCreditoService = cartaoCreditoService;
        this.assinaturaService = assinaturaService;
        this.categoriaService = categoriaService;
        this.parceiroService = parceiroService;
        this.contaService = contaService;
        this.securityCtx = securityCtx;
        this.auditoria = auditoria;
    }

    // ── Conta corrente ────────────────────────────────────────────────────────

    @Tool(description = "Cadastra uma conta corrente (conta bancária). Confirme os dados antes.")
    public ContaCorrenteResponseDto registrarContaCorrente(
            @ToolParam(description = "Número da conta") String numeroConta,
            @ToolParam(description = "Agência") String agencia,
            @ToolParam(description = "Descrição/apelido. Ex: 'Nubank', 'Conta Itaú'") String descricao,
            @ToolParam(description = "Saldo inicial em reais. Padrão 0") BigDecimal saldoInicial,
            @ToolParam(description = "Data do saldo inicial (YYYY-MM-DD). Padrão: hoje") LocalDate dataSaldoInicial,
            @ToolParam(description = "Permitir saldo negativo? Padrão false") Boolean permitirSaldoNegativo) {
        audit("registrarContaCorrente", "descricao=" + descricao);
        ContaCorrenteResponseDto existente = contaCorrenteService.listar().stream()
                .filter(c -> igual(c.descricao(), descricao)).findFirst().orElse(null);
        if (existente != null) return existente;
        return contaCorrenteService.criar(new ContaCorrenteRequestDto(
                numeroConta, agencia, descricao,
                saldoInicial != null ? saldoInicial : BigDecimal.ZERO,
                dataSaldoInicial != null ? dataSaldoInicial : LocalDate.now(),
                Boolean.TRUE.equals(permitirSaldoNegativo)));
    }

    @Tool(description = """
            Edita uma conta corrente (identificada pela descrição/nome atual). Informe só o que mudar.
            O saldo NÃO é editável (é calculado por lançamentos/transferências). Confirme antes.
            """)
    public ContaCorrenteResponseDto atualizarContaCorrente(
            @ToolParam(description = "Descrição/nome ATUAL da conta corrente a editar") String conta,
            @ToolParam(description = "Novo número (opcional)") String numeroConta,
            @ToolParam(description = "Nova agência (opcional)") String agencia,
            @ToolParam(description = "Nova descrição (opcional)") String novaDescricao,
            @ToolParam(description = "Permitir saldo negativo (opcional)") Boolean permitirSaldoNegativo) {
        ContaCorrenteResponseDto atual = acharContaCorrente(conta);
        audit("atualizarContaCorrente", "id=" + atual.id());
        return contaCorrenteService.atualizar(atual.id(), new ContaCorrenteRequestDto(
                numeroConta != null ? numeroConta : atual.numeroConta(),
                agencia != null ? agencia : atual.agencia(),
                novaDescricao != null ? novaDescricao : atual.descricao(),
                atual.saldo(), atual.dataSaldoInicial(),
                permitirSaldoNegativo != null ? permitirSaldoNegativo : atual.permitirSaldoNegativo()));
    }

    @Tool(description = """
            Exclui uma conta corrente (pela descrição/nome). Bloqueado se houver transferências,
            baixas, conciliações ou cartão vinculados. Confirme antes.
            """)
    public String excluirContaCorrente(
            @ToolParam(description = "Descrição/nome da conta corrente a excluir") String conta) {
        ContaCorrenteResponseDto alvo = acharContaCorrente(conta);
        audit("excluirContaCorrente", "id=" + alvo.id());
        contaCorrenteService.deletar(alvo.id());
        return "Conta corrente '" + alvo.descricao() + "' excluída com sucesso.";
    }

    // ── Cartão de crédito ─────────────────────────────────────────────────────

    @Tool(description = """
            Cadastra um cartão de crédito vinculado a uma conta corrente (pelo nome da conta).
            Confirme antes.
            """)
    public CartaoCreditoResponseDto registrarCartaoCredito(
            @ToolParam(description = "Nome do cartão. Ex: 'Nubank Roxinho'") String nome,
            @ToolParam(description = "Limite total em reais") BigDecimal limite,
            @ToolParam(description = "Dia de fechamento (1 a 31)") Integer diaFechamento,
            @ToolParam(description = "Dia de vencimento (1 a 31)") Integer diaVencimento,
            @ToolParam(description = "Nome/descrição da conta corrente vinculada") String contaCorrente) {
        audit("registrarCartaoCredito", "nome=" + nome);
        CartaoCreditoResponseDto existente = cartoes().stream()
                .filter(c -> igual(c.nome(), nome)).findFirst().orElse(null);
        if (existente != null) return existente;
        Long contaId = acharContaCorrente(contaCorrente).id();
        return cartaoCreditoService.criar(new CartaoCreditoRequestDto(
                nome, limite, diaFechamento, diaVencimento, contaId));
    }

    @Tool(description = "Edita um cartão de crédito (pelo nome). Informe só o que mudar. Confirme antes.")
    public CartaoCreditoResponseDto atualizarCartaoCredito(
            @ToolParam(description = "Nome ATUAL do cartão a editar") String cartao,
            @ToolParam(description = "Novo nome (opcional)") String novoNome,
            @ToolParam(description = "Novo limite (opcional)") BigDecimal limite,
            @ToolParam(description = "Novo dia de fechamento 1-31 (opcional)") Integer diaFechamento,
            @ToolParam(description = "Novo dia de vencimento 1-31 (opcional)") Integer diaVencimento,
            @ToolParam(description = "Nova conta corrente vinculada, pelo nome (opcional)") String contaCorrente) {
        CartaoCreditoResponseDto atual = acharCartao(cartao);
        audit("atualizarCartaoCredito", "id=" + atual.id());
        Long contaId = (contaCorrente != null && !contaCorrente.isBlank())
                ? acharContaCorrente(contaCorrente).id() : atual.contaCorrenteId();
        return cartaoCreditoService.atualizar(atual.id(), new CartaoCreditoRequestDto(
                novoNome != null ? novoNome : atual.nome(),
                limite != null ? limite : atual.limite(),
                diaFechamento != null ? diaFechamento : atual.diaFechamento(),
                diaVencimento != null ? diaVencimento : atual.diaVencimento(),
                contaId));
    }

    @Tool(description = """
            Exclui um cartão de crédito (pelo nome). Bloqueado se houver lançamentos associados.
            Confirme antes.
            """)
    public String excluirCartaoCredito(@ToolParam(description = "Nome do cartão a excluir") String cartao) {
        CartaoCreditoResponseDto alvo = acharCartao(cartao);
        audit("excluirCartaoCredito", "id=" + alvo.id());
        cartaoCreditoService.deletar(alvo.id());
        return "Cartão '" + alvo.nome() + "' excluído com sucesso.";
    }

    // ── Lançamentos do cartão ─────────────────────────────────────────────────

    @Tool(description = """
            Lista os lançamentos de um cartão (pelo nome do cartão). Retorna id, descrição, valor,
            data e fatura. Use para obter o ID do lançamento antes de editar/excluir.
            """)
    public List<LancamentoResponseDto> consultarLancamentosCartao(
            @ToolParam(description = "Nome do cartão") String cartao,
            @ToolParam(description = "Mês da fatura (opcional)") Integer mes,
            @ToolParam(description = "Ano da fatura (opcional)") Integer ano) {
        Long cartaoId = acharCartao(cartao).id();
        return cartaoCreditoService.listarLancamentos(cartaoId, mes, ano, null);
    }

    @Tool(description = """
            Edita um lançamento de cartão. Informe o nome do cartão e o ID do lançamento (obtenha via
            consultarLancamentosCartao). Informe só o que mudar. BLOQUEADO se a fatura estiver
            fechada. Confirme antes.
            """)
    public LancamentoResponseDto atualizarLancamentoCartao(
            @ToolParam(description = "Nome do cartão") String cartao,
            @ToolParam(description = "ID do lançamento (de consultarLancamentosCartao)") Long lancamentoId,
            @ToolParam(description = "Nova descrição (opcional)") String descricao,
            @ToolParam(description = "Novo valor (opcional)") BigDecimal valor,
            @ToolParam(description = "Nova data da compra YYYY-MM-DD (opcional)") LocalDate dataCompra,
            @ToolParam(description = "Nova categoria, pelo nome (opcional)") String categoria,
            @ToolParam(description = "Tipo: SAIDA ou ENTRADA (opcional)") String tipo) {
        Long cartaoId = acharCartao(cartao).id();
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
        Long categoriaId = (categoria != null && !categoria.isBlank())
                ? acharCategoriaId(categoria) : atual.categoriaId();
        return cartaoCreditoService.atualizarLancamento(cartaoId, lancamentoId, new LancamentoRequestDto(
                descricao != null ? descricao : atual.descricao(),
                valor != null ? valor : atual.valor(),
                dataCompra != null ? dataCompra : atual.dataCompra(),
                categoriaId, atual.parceiroId(), 1, false, tipoEnum));
    }

    @Tool(description = """
            Exclui um lançamento de cartão (nome do cartão + ID do lançamento de
            consultarLancamentosCartao). BLOQUEADO se a fatura estiver fechada. Confirme antes.
            """)
    public String excluirLancamentoCartao(
            @ToolParam(description = "Nome do cartão") String cartao,
            @ToolParam(description = "ID do lançamento a excluir") Long lancamentoId) {
        Long cartaoId = acharCartao(cartao).id();
        audit("excluirLancamentoCartao", "cartaoId=" + cartaoId + " lancamentoId=" + lancamentoId);
        cartaoCreditoService.deletarLancamento(cartaoId, lancamentoId);
        return "Lançamento excluído com sucesso.";
    }

    // ── Assinaturas ───────────────────────────────────────────────────────────

    @Tool(description = """
            Cadastra uma assinatura/recorrência (ex.: Netflix). categoria é obrigatória (pelo nome).
            Pode vincular a um cartão e a um parceiro (ambos pelo nome, opcionais). Confirme antes.
            """)
    public AssinaturaResponseDto registrarAssinatura(
            @ToolParam(description = "Descrição. Ex: 'Netflix'") String descricao,
            @ToolParam(description = "Valor mensal em reais") BigDecimal valor,
            @ToolParam(description = "Dia de vencimento (1 a 31)") Integer diaVencimento,
            @ToolParam(description = "Nome da categoria") String categoria,
            @ToolParam(description = "Nome do parceiro (opcional)") String parceiro,
            @ToolParam(description = "Nome do cartão de crédito para cobrança (opcional)") String cartao,
            @ToolParam(description = "Ativa? Padrão true") Boolean ativa) {
        audit("registrarAssinatura", "descricao=" + descricao);
        AssinaturaResponseDto existente = assinaturaService.listar().stream()
                .filter(a -> igual(a.descricao(), descricao)).findFirst().orElse(null);
        if (existente != null) return existente;
        return assinaturaService.criar(new AssinaturaRequestDto(
                descricao, valor, diaVencimento, ativa,
                acharCategoriaId(categoria), acharParceiroId(parceiro), acharCartaoId(cartao)));
    }

    @Tool(description = "Edita uma assinatura (pela descrição). Informe só o que mudar. Confirme antes.")
    public AssinaturaResponseDto atualizarAssinatura(
            @ToolParam(description = "Descrição ATUAL da assinatura a editar") String assinatura,
            @ToolParam(description = "Nova descrição (opcional)") String novaDescricao,
            @ToolParam(description = "Novo valor (opcional)") BigDecimal valor,
            @ToolParam(description = "Novo dia de vencimento 1-31 (opcional)") Integer diaVencimento,
            @ToolParam(description = "Nova categoria, pelo nome (opcional)") String categoria,
            @ToolParam(description = "Novo parceiro, pelo nome (opcional)") String parceiro,
            @ToolParam(description = "Novo cartão, pelo nome (opcional)") String cartao,
            @ToolParam(description = "Ativa? true/false (opcional)") Boolean ativa) {
        AssinaturaResponseDto atual = acharAssinatura(assinatura);
        audit("atualizarAssinatura", "id=" + atual.id());
        return assinaturaService.atualizar(atual.id(), new AssinaturaRequestDto(
                novaDescricao != null ? novaDescricao : atual.descricao(),
                valor != null ? valor : atual.valor(),
                diaVencimento != null ? diaVencimento : atual.diaVencimento(),
                ativa != null ? ativa : atual.ativa(),
                (categoria != null && !categoria.isBlank()) ? acharCategoriaId(categoria) : atual.categoriaId(),
                (parceiro != null && !parceiro.isBlank()) ? acharParceiroId(parceiro) : atual.parceiroId(),
                (cartao != null && !cartao.isBlank()) ? acharCartaoId(cartao) : atual.cartaoCreditoId()));
    }

    @Tool(description = "Exclui uma assinatura (pela descrição). Confirme antes.")
    public String excluirAssinatura(
            @ToolParam(description = "Descrição da assinatura a excluir") String assinatura) {
        AssinaturaResponseDto alvo = acharAssinatura(assinatura);
        audit("excluirAssinatura", "id=" + alvo.id());
        assinaturaService.deletar(alvo.id());
        return "Assinatura '" + alvo.descricao() + "' excluída com sucesso.";
    }

    // ── Fechamento de fatura ──────────────────────────────────────────────────

    @Tool(description = """
            Fecha a fatura de um cartão para um mês/ano. Gera uma conta a pagar com o total líquido
            (SAÍDAS − ENTRADAS). Não fecha se o total for zero/negativo ou se já estiver fechada.
            Use o NOME do cartão. Confirme com o usuário antes de executar.
            """)
    public ContaResponseDto fecharFatura(
            @ToolParam(description = "Nome do cartão") String cartao,
            @ToolParam(description = "Mês da fatura (1 a 12)") Integer mes,
            @ToolParam(description = "Ano da fatura. Ex: 2026") Integer ano) {
        Long cartaoId = acharCartao(cartao).id();
        audit("fecharFatura", "cartaoId=" + cartaoId + " mes=" + mes + " ano=" + ano);
        return cartaoCreditoService.fecharFatura(cartaoId, new FechamentoFaturaRequestDto(mes, ano));
    }

    // ── Métricas / análises ───────────────────────────────────────────────────

    @Tool(description = """
            Métricas de gastos no cartão de crédito, agrupadas por categoria no período (total gasto
            por categoria/mês). Se omitir o período, usa os últimos 3 meses. Útil para responder
            'quanto gastei no cartão' e 'onde gastei mais no cartão'.
            """)
    public List<CartaoDashboardResumoDto> consultarGastosCartao(
            @ToolParam(description = "Mês de início (opcional)") Integer mesInicio,
            @ToolParam(description = "Ano de início (opcional)") Integer anoInicio,
            @ToolParam(description = "Mês de fim (opcional)") Integer mesFim,
            @ToolParam(description = "Ano de fim (opcional)") Integer anoFim) {
        return cartaoCreditoService.dashboardResumo(mesInicio, anoInicio, mesFim, anoFim);
    }

    @Tool(description = """
            Total já pago (saídas) por CONTA CORRENTE, da que mais gastou para a que menos gastou.
            Use para responder 'qual conta corrente eu mais gasto / gastei'.
            """)
    public List<GastoContaCorrenteDto> consultarGastosPorContaCorrente() {
        return contaService.gastoPorContaCorrente();
    }

    // ── Categoria (editar/excluir) ────────────────────────────────────────────

    @Tool(description = """
            Edita uma categoria (pela descrição atual). Pode mudar a descrição e/ou o ícone.
            Confirme antes de executar.
            """)
    public CategoriaResponseDto atualizarCategoria(
            @ToolParam(description = "Descrição ATUAL da categoria") String categoria,
            @ToolParam(description = "Nova descrição (opcional)") String novaDescricao,
            @ToolParam(description = "Novo ícone (opcional)") String icone) {
        CategoriaResponseDto atual = acharCategoria(categoria);
        audit("atualizarCategoria", "id=" + atual.id());
        return categoriaService.atualizar(atual.id(), new CategoriaRequestDto(
                novaDescricao != null ? novaDescricao : atual.descricao(),
                icone != null ? icone : atual.icone()));
    }

    @Tool(description = """
            Exclui uma categoria (pela descrição). Bloqueado se houver lançamentos/contas usando a
            categoria. Confirme antes de executar.
            """)
    public String excluirCategoria(@ToolParam(description = "Descrição da categoria a excluir") String categoria) {
        CategoriaResponseDto alvo = acharCategoria(categoria);
        audit("excluirCategoria", "id=" + alvo.id());
        categoriaService.deletar(alvo.id());
        return "Categoria '" + alvo.descricao() + "' excluída com sucesso.";
    }

    // ── Parceiro (editar/excluir) ─────────────────────────────────────────────

    @Tool(description = """
            Edita um parceiro (pelo nome/razão social atual). Pode mudar razão social, nome fantasia,
            tipo (CLIENTE/FORNECEDOR/AMBOS), telefone e e-mail. Confirme antes de executar.
            """)
    public ParceiroResponseDto atualizarParceiro(
            @ToolParam(description = "Razão social/nome ATUAL do parceiro") String parceiro,
            @ToolParam(description = "Nova razão social (opcional)") String novaRazaoSocial,
            @ToolParam(description = "Novo nome fantasia (opcional)") String nomeFantasia,
            @ToolParam(description = "Novo tipo: CLIENTE, FORNECEDOR ou AMBOS (opcional)") String tipo,
            @ToolParam(description = "Novo telefone (opcional)") String telefone,
            @ToolParam(description = "Novo e-mail (opcional)") String email) {
        ParceiroResponseDto a = acharParceiro(parceiro);
        audit("atualizarParceiro", "id=" + a.id());
        TipoParceiro tipoEnum = a.tipo();
        if (tipo != null && !tipo.isBlank()) {
            try {
                tipoEnum = TipoParceiro.valueOf(tipo.toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Tipo inválido: '" + tipo + "'. Use CLIENTE, FORNECEDOR ou AMBOS.");
            }
        }
        return parceiroService.atualizar(a.id(), new ParceiroRequestDto(
                novaRazaoSocial != null ? novaRazaoSocial : a.razaoSocial(),
                nomeFantasia != null ? nomeFantasia : a.nomeFantasia(),
                a.cpfCnpj(), tipoEnum,
                a.logradouro(), a.numero(), a.complemento(), a.cep(), a.bairro(), a.municipio(), a.uf(),
                telefone != null ? telefone : a.telefone(),
                email != null ? email : a.email()));
    }

    @Tool(description = """
            Exclui um parceiro (pelo nome/razão social). Bloqueado se houver lançamentos/contas
            vinculados a ele. Confirme antes de executar.
            """)
    public String excluirParceiro(@ToolParam(description = "Razão social/nome do parceiro a excluir") String parceiro) {
        ParceiroResponseDto alvo = acharParceiro(parceiro);
        audit("excluirParceiro", "id=" + alvo.id());
        parceiroService.deletar(alvo.id());
        return "Parceiro '" + alvo.razaoSocial() + "' excluído com sucesso.";
    }

    // ── Resolvers por nome ────────────────────────────────────────────────────

    private static boolean igual(String a, String b) {
        return a != null && b != null && a.strip().equalsIgnoreCase(b.strip());
    }

    private List<CartaoCreditoResponseDto> cartoes() {
        return cartaoCreditoService.listar(PageRequest.of(0, 200)).getContent();
    }

    private ContaCorrenteResponseDto acharContaCorrente(String descricao) {
        List<ContaCorrenteResponseDto> m = contaCorrenteService.listar().stream()
                .filter(c -> igual(c.descricao(), descricao)).toList();
        return unico(m, "conta corrente", descricao);
    }

    private CartaoCreditoResponseDto acharCartao(String nome) {
        List<CartaoCreditoResponseDto> m = cartoes().stream()
                .filter(c -> igual(c.nome(), nome)).toList();
        return unico(m, "cartão", nome);
    }

    private AssinaturaResponseDto acharAssinatura(String descricao) {
        List<AssinaturaResponseDto> m = assinaturaService.listar().stream()
                .filter(a -> igual(a.descricao(), descricao)).toList();
        return unico(m, "assinatura", descricao);
    }

    private CategoriaResponseDto acharCategoria(String nome) {
        List<CategoriaResponseDto> m = categoriaService.listar(PageRequest.of(0, 500)).getContent().stream()
                .filter(c -> igual(c.descricao(), nome)).toList();
        return unico(m, "categoria", nome);
    }

    private Long acharCategoriaId(String nome) {
        return acharCategoria(nome).id();
    }

    private ParceiroResponseDto acharParceiro(String nome) {
        List<ParceiroResponseDto> m = parceiroService.listar(PageRequest.of(0, 500)).getContent().stream()
                .filter(p -> igual(p.razaoSocial(), nome) || igual(p.nomeFantasia(), nome)).toList();
        return unico(m, "parceiro", nome);
    }

    /** Parceiro é opcional em vínculos: null/blank devolve null (sem parceiro). */
    private Long acharParceiroId(String nome) {
        if (nome == null || nome.isBlank()) return null;
        return acharParceiro(nome).id();
    }

    /** Cartão opcional (para vínculo): null/blank devolve null. */
    private Long acharCartaoId(String nome) {
        return (nome == null || nome.isBlank()) ? null : acharCartao(nome).id();
    }

    private <T> T unico(List<T> matches, String tipo, String nome) {
        if (matches.isEmpty()) {
            throw new EntityNotFoundException("Nenhum(a) " + tipo + " encontrado(a) com o nome '" + nome + "'.");
        }
        if (matches.size() > 1) {
            throw new IllegalArgumentException("Há mais de um(a) " + tipo + " chamado(a) '" + nome
                    + "'. Seja mais específico ou use a tela do sistema.");
        }
        return matches.get(0);
    }

    private void audit(String ferramenta, String detalhe) {
        log.info("[CHAT-AUDIT] user={} tool={} {}", securityCtx.getUsuarioId(), ferramenta, detalhe);
        auditoria.registrar(ferramenta, detalhe);
    }
}
