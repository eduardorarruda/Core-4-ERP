package br.com.core4erp.chat.tools.consulta;

import br.com.core4erp.cartaoCredito.dto.CartaoCreditoResponseDto;
import br.com.core4erp.cartaoCredito.service.CartaoCreditoService;
import br.com.core4erp.categoria.dto.CategoriaResponseDto;
import br.com.core4erp.categoria.service.CategoriaService;
import br.com.core4erp.contaCorrente.dto.ContaCorrenteResponseDto;
import br.com.core4erp.contaCorrente.service.ContaCorrenteService;
import br.com.core4erp.dashboard.dto.DashboardResponseDto;
import br.com.core4erp.dashboard.service.DashboardService;
import br.com.core4erp.investimento.dto.ContaInvestimentoResponseDto;
import br.com.core4erp.investimento.service.InvestimentoService;
import br.com.core4erp.notificacao.dto.NotificacaoResponseDto;
import br.com.core4erp.notificacao.service.NotificacaoService;
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

    public ConsultaTools(DashboardService dashboardService,
                         ContaCorrenteService contaCorrenteService,
                         CategoriaService categoriaService,
                         CartaoCreditoService cartaoCreditoService,
                         InvestimentoService investimentoService,
                         NotificacaoService notificacaoService) {
        this.dashboardService = dashboardService;
        this.contaCorrenteService = contaCorrenteService;
        this.categoriaService = categoriaService;
        this.cartaoCreditoService = cartaoCreditoService;
        this.investimentoService = investimentoService;
        this.notificacaoService = notificacaoService;
    }

    @Tool(description = """
            Retorna o resumo financeiro completo do usuário:
            saldo total das contas correntes, total a pagar (pendente + atrasado),
            total a receber, patrimônio em investimentos, limite total e usado
            dos cartões de crédito, fluxo de caixa dos últimos 6 meses
            (receitas recebidas vs despesas pagas por mês), top 5 despesas
            por categoria do mês atual, quantidade de contas vencendo hoje
            e quantidade de contas atrasadas.
            Use para: "Qual meu saldo?", "Como estão minhas finanças?",
            "Quanto tenho a pagar?", "Resumo financeiro".
            """)
    public DashboardResponseDto consultarDashboard() {
        return dashboardService.getDashboard();
    }

    @Tool(description = """
            Lista todas as contas correntes do usuário com: id, número da conta,
            agência, descrição e saldo atual. Use para: "Quais são minhas contas?",
            "Qual o saldo da conta X?", "Em qual conta tenho mais dinheiro?".
            """)
    public List<ContaCorrenteResponseDto> consultarContasCorrentes() {
        return contaCorrenteService.listar();
    }

    @Tool(description = """
            Lista todas as categorias de despesa e receita com id, descrição e ícone.
            IMPORTANTE: use esta ferramenta ANTES de registrar qualquer lançamento
            para descobrir o categoriaId correto. Nunca invente um categoriaId.
            """)
    public List<CategoriaResponseDto> consultarCategorias() {
        return categoriaService.listar(PageRequest.of(0, 200, Sort.by("descricao"))).getContent();
    }

    @Tool(description = """
            Lista os cartões de crédito do usuário com: id, nome, limite total,
            limite usado, limite livre, dia de fechamento e dia de vencimento.
            Use para: "Quais meus cartões?", "Quanto tenho de limite?",
            "Qual cartão tem mais limite livre?".
            """)
    public List<CartaoCreditoResponseDto> consultarCartoes() {
        return cartaoCreditoService.listar(PageRequest.of(0, 200)).getContent();
    }

    @Tool(description = """
            Lista as carteiras de investimento do usuário com: id, nome, tipo e saldo atual.
            Use para: "Quanto tenho investido?", "Quais meus investimentos?".
            """)
    public List<ContaInvestimentoResponseDto> consultarInvestimentos() {
        return investimentoService.listar();
    }

    @Tool(description = """
            Lista as notificações não lidas do usuário (alertas de contas
            vencidas e faturas de cartão). Use para: "Tenho notificações?",
            "Algum alerta?", "O que preciso pagar?".
            """)
    public List<NotificacaoResponseDto> consultarNotificacoes() {
        return notificacaoService.listarNaoLidas();
    }
}
