package br.com.core4erp.chat.config;

import br.com.core4erp.chat.tools.cadastro.CadastroTools;
import br.com.core4erp.chat.tools.consulta.ConsultaTools;
import br.com.core4erp.chat.tools.gestao.GestaoFinanceiraTools;
import br.com.core4erp.chat.tools.lancamento.LancamentoTools;
import br.com.core4erp.chat.tools.relatorio.RelatorioTools;
import org.springframework.ai.tool.ToolCallbackProvider;
import org.springframework.ai.tool.method.MethodToolCallbackProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Expõe as "habilidades" financeiras do Core 4 (as mesmas ferramentas usadas pela Áurea) como um
 * MCP Server. Assim o backend passa a ser um servidor MCP: as capacidades de consulta, cadastro,
 * gestão, lançamento e relatório ficam disponíveis pelo protocolo MCP (transport SSE/WebMVC).
 *
 * <p><b>Interno por padrão:</b> os endpoints MCP ({@code /sse}, {@code /mcp/message}) exigem
 * autenticação (não estão na lista de rotas públicas) e o nginx só faz proxy de {@code /api/} —
 * logo o MCP não é exposto para fora, só acessível dentro da rede (uso interno).
 *
 * <p><b>Contexto de tenant:</b> as ferramentas continuam exigindo {@code TenantContext}
 * (empresa/permissões). Fazer a Áurea CONSUMIR via cliente MCP (em vez de in-process) é o próximo
 * passo e depende de propagar o tenant através do transporte MCP — por isso, por ora, o chat segue
 * usando as ferramentas in-process e este server apenas as publica.
 */
@Configuration
public class McpServerConfig {

    @Bean
    public ToolCallbackProvider core4ToolCallbacks(ConsultaTools consultaTools,
                                                   CadastroTools cadastroTools,
                                                   GestaoFinanceiraTools gestaoFinanceiraTools,
                                                   LancamentoTools lancamentoTools,
                                                   RelatorioTools relatorioTools) {
        return MethodToolCallbackProvider.builder()
                .toolObjects(consultaTools, cadastroTools, gestaoFinanceiraTools,
                        lancamentoTools, relatorioTools)
                .build();
    }
}
