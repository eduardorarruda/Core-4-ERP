package br.com.core4erp.chat.service;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marca uma ferramenta do chat ({@code @Tool} em {@code chat.tools..}) como AÇÃO CRÍTICA: destrutiva/
 * irreversível (exclusão, estorno) ou que MOVIMENTA DINHEIRO (baixa, transferência, aporte/resgate,
 * fechamento de fatura).
 *
 * <p>Ferramentas marcadas passam pelo {@link GateAcaoCriticaAspect}: a 1ª chamada numa conversa NÃO
 * executa — registra uma ação pendente e devolve ao modelo "CONFIRMAÇÃO NECESSÁRIA" com um resumo;
 * a execução só ocorre no turno SEGUINTE, se o usuário confirmar explicitamente ("sim") e a chamada
 * repetir a mesma ferramenta com os mesmos argumentos.
 *
 * <p>A classificação é EXPLÍCITA (esta anotação), nunca por heurística de nome. Toda ferramenta nova
 * que exclua, estorne ou movimente saldo DEVE receber esta anotação — o teste
 * {@code GateAcaoCriticaAspectTest#todaFerramentaDestrutivaOuFinanceiraEstaAnotada} trava a lista.
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface AcaoCritica {

    /** O que a ferramenta faz, em linguagem do usuário (ex.: "Excluir a conta a pagar/receber"). */
    String value();
}
