package br.com.core4erp.chat.tools.consulta;

import br.com.core4erp.assinatura.dto.AssinaturaResponseDto;
import br.com.core4erp.assinatura.service.AssinaturaService;
import br.com.core4erp.cartaoCredito.dto.CartaoCreditoResponseDto;
import br.com.core4erp.cartaoCredito.service.CartaoCreditoService;
import br.com.core4erp.categoria.dto.CategoriaResponseDto;
import br.com.core4erp.categoria.service.CategoriaService;
import br.com.core4erp.contaCorrente.dto.ContaCorrenteResponseDto;
import br.com.core4erp.contaCorrente.service.ContaCorrenteService;
import br.com.core4erp.dashboard.service.DashboardService;
import br.com.core4erp.investimento.dto.ContaInvestimentoResponseDto;
import br.com.core4erp.investimento.service.InvestimentoService;
import br.com.core4erp.notificacao.dto.NotificacaoResponseDto;
import br.com.core4erp.notificacao.service.NotificacaoService;
import br.com.core4erp.parceiro.dto.ParceiroResponseDto;
import br.com.core4erp.parceiro.service.ParceiroService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ConsultaTools {

    private final DashboardService dashboardService;
    private final ContaCorrenteService contaCorrenteService;
    private final CategoriaService categoriaService;
    private final CartaoCreditoService cartaoCreditoService;
    private final InvestimentoService investimentoService;
    private final NotificacaoService notificacaoService;
    private final AssinaturaService assinaturaService;
    private final ParceiroService parceiroService;

    public ConsultaTools(DashboardService dashboardService,
                         ContaCorrenteService contaCorrenteService,
                         CategoriaService categoriaService,
                         CartaoCreditoService cartaoCreditoService,
                         InvestimentoService investimentoService,
                         NotificacaoService notificacaoService,
                         AssinaturaService assinaturaService,
                         ParceiroService parceiroService) {
        this.dashboardService = dashboardService;
        this.contaCorrenteService = contaCorrenteService;
        this.categoriaService = categoriaService;
        this.cartaoCreditoService = cartaoCreditoService;
        this.investimentoService = investimentoService;
        this.notificacaoService = notificacaoService;
        this.assinaturaService = assinaturaService;
        this.parceiroService = parceiroService;
    }

    @Tool(description = """
            Resumo financeiro do usuário: saldo, total a pagar/receber, investimentos,
            cartões, fluxo dos últimos meses, top despesas por categoria e contas
            vencendo/atrasadas. Use para saldo, "como estão minhas finanças", resumo.
            """)
    public DashboardResumoDto consultarDashboard() {
        return DashboardResumoDto.from(dashboardService.getDashboard());
    }

    @Tool(description = "Lista as contas correntes (id, número, agência, descrição, saldo).")
    public List<ContaCorrenteResponseDto> consultarContasCorrentes() {
        return contaCorrenteService.listar();
    }

    @Tool(description = """
            Lista as categorias (id, descrição, ícone). Use ANTES de registrar um lançamento
            para obter o categoriaId correto. Nunca invente um categoriaId.
            """)
    public List<CategoriaResponseDto> consultarCategorias() {
        return categoriaService.listar(PageRequest.of(0, 200, Sort.by("descricao"))).getContent();
    }

    @Tool(description = "Lista os cartões de crédito (id, nome, limite total/usado/livre, fechamento, vencimento).")
    public List<CartaoCreditoResponseDto> consultarCartoes() {
        return cartaoCreditoService.listar(PageRequest.of(0, 200)).getContent();
    }

    @Tool(description = "Lista as carteiras de investimento (id, nome, tipo, saldo).")
    public List<ContaInvestimentoResponseDto> consultarInvestimentos() {
        return investimentoService.listar();
    }

    @Tool(description = "Lista notificações não lidas (contas vencidas e faturas de cartão).")
    public List<NotificacaoResponseDto> consultarNotificacoes() {
        return notificacaoService.listarNaoLidas();
    }

    @Tool(description = "Lista assinaturas/recorrências (valor mensal e dia de vencimento).")
    public List<AssinaturaResponseDto> consultarAssinaturas() {
        return assinaturaService.listar();
    }

    @Tool(description = """
            Lista os parceiros (id, razão social, nome fantasia, CPF/CNPJ, tipo). Use SEMPRE
            para localizar um parceiro pelo nome e obter o parceiroId antes de vincular um
            lançamento. Reaproveite parceiro existente; nunca cadastre duplicado.
            """)
    public List<ParceiroResponseDto> consultarParceiros() {
        return parceiroService.listar(PageRequest.of(0, 200, Sort.by("razaoSocial"))).getContent();
    }
}
