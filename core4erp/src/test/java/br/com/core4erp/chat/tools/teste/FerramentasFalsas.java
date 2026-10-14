package br.com.core4erp.chat.tools.teste;

import br.com.core4erp.chat.service.AcaoCritica;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;

import java.math.BigDecimal;
import java.util.concurrent.atomic.AtomicInteger;

/** Tools de teste no pacote chat.tools (alcançado pelos pointcuts dos gates do chat). */
public class FerramentasFalsas {

    public final AtomicInteger escritas = new AtomicInteger();

    @Tool(description = "Consulta saldo (leitura)")
    public String consultarSaldo() {
        return "saldo=100";
    }

    @Tool(description = "Registra parceiro (escrita)")
    public String registrarParceiro(@ToolParam(description = "nome") String nome) {
        escritas.incrementAndGet();
        return "criado " + nome;
    }

    public final AtomicInteger acoesCriticas = new AtomicInteger();

    @Tool(description = "Exclui registro (ação crítica)")
    @AcaoCritica("Excluir o registro")
    public String excluirRegistro(@ToolParam(description = "id") Long id) {
        acoesCriticas.incrementAndGet();
        return "excluido " + id;
    }

    @Tool(description = "Transfere valor (ação crítica)")
    @AcaoCritica("Transferir valor")
    public String transferir(@ToolParam(description = "destino") String destino,
                             @ToolParam(description = "valor") BigDecimal valor) {
        acoesCriticas.incrementAndGet();
        return "transferido " + valor + " para " + destino;
    }
}
