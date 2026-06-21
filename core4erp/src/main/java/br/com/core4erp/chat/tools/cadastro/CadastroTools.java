package br.com.core4erp.chat.tools.cadastro;

import br.com.core4erp.categoria.dto.CategoriaRequestDto;
import br.com.core4erp.categoria.dto.CategoriaResponseDto;
import br.com.core4erp.categoria.service.CategoriaService;
import br.com.core4erp.chat.service.ChatAuditoriaService;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.enums.TipoParceiro;
import br.com.core4erp.parceiro.dto.ParceiroRequestDto;
import br.com.core4erp.parceiro.dto.ParceiroResponseDto;
import br.com.core4erp.parceiro.service.ParceiroService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

/**
 * Ferramentas de cadastro (parceiros e categorias) acionáveis pelo chat IA.
 */
@Slf4j
@Component
public class CadastroTools {

    private final ParceiroService parceiroService;
    private final CategoriaService categoriaService;
    private final SecurityContextUtils securityCtx;
    private final ChatAuditoriaService auditoria;

    public CadastroTools(ParceiroService parceiroService,
                         CategoriaService categoriaService,
                         SecurityContextUtils securityCtx,
                         ChatAuditoriaService auditoria) {
        this.parceiroService = parceiroService;
        this.categoriaService = categoriaService;
        this.securityCtx = securityCtx;
        this.auditoria = auditoria;
    }

    @Tool(description = """
            Cadastra um novo parceiro (cliente, fornecedor ou ambos).
            Campos obrigatórios: razaoSocial (nome) e tipo.
            CPF/CNPJ é opcional, mas se informado deve ser válido e único.
            CONFIRME os dados com o usuário antes de executar.
            """)
    public ParceiroResponseDto registrarParceiro(
            @ToolParam(description = "Razão social ou nome do parceiro") String razaoSocial,
            @ToolParam(description = "Tipo do parceiro: CLIENTE, FORNECEDOR ou AMBOS") String tipo,
            @ToolParam(description = "CPF ou CNPJ. Opcional, pode ser null") String cpfCnpj,
            @ToolParam(description = "Nome fantasia. Opcional, pode ser null") String nomeFantasia,
            @ToolParam(description = "Telefone. Opcional, pode ser null") String telefone,
            @ToolParam(description = "E-mail. Opcional, pode ser null") String email) {
        log.info("[CHAT-AUDIT] user={} tool=registrarParceiro razaoSocial={} tipo={}",
                securityCtx.getEmail(), razaoSocial, tipo);
        auditoria.registrar("registrarParceiro", "razaoSocial=" + razaoSocial + " tipo=" + tipo);
        TipoParceiro tipoEnum;
        try {
            tipoEnum = TipoParceiro.valueOf(tipo.toUpperCase());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new IllegalArgumentException(
                    "Tipo de parceiro inválido: '" + tipo + "'. Use CLIENTE, FORNECEDOR ou AMBOS.");
        }
        ParceiroRequestDto dto = new ParceiroRequestDto(
                razaoSocial, nomeFantasia, cpfCnpj, tipoEnum,
                null, null, null, null, null, null, null,
                telefone, email);
        return parceiroService.criar(dto);
    }

    @Tool(description = """
            Altera o TIPO de um parceiro existente (CLIENTE, FORNECEDOR ou AMBOS).
            Use, por exemplo, quando o usuário quiser lançar uma despesa para um parceiro que
            hoje é apenas CLIENTE: pergunte se deseja mudar para AMBOS e, se confirmado, use esta
            ferramenta. Obtenha o parceiroId via consultarParceiros.
            """)
    public ParceiroResponseDto atualizarTipoParceiro(
            @ToolParam(description = "ID do parceiro (use consultarParceiros para descobrir)") Long parceiroId,
            @ToolParam(description = "Novo tipo: CLIENTE, FORNECEDOR ou AMBOS") String tipo) {
        log.info("[CHAT-AUDIT] user={} tool=atualizarTipoParceiro parceiroId={} tipo={}",
                securityCtx.getEmail(), parceiroId, tipo);
        auditoria.registrar("atualizarTipoParceiro", "parceiroId=" + parceiroId + " tipo=" + tipo);
        TipoParceiro tipoEnum;
        try {
            tipoEnum = TipoParceiro.valueOf(tipo.toUpperCase());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new IllegalArgumentException(
                    "Tipo de parceiro inválido: '" + tipo + "'. Use CLIENTE, FORNECEDOR ou AMBOS.");
        }
        return parceiroService.atualizarTipo(parceiroId, tipoEnum);
    }

    @Tool(description = """
            Cadastra uma nova categoria de receita/despesa.
            Campo obrigatório: descricao. O ícone é opcional.
            Use quando o usuário quiser uma categoria que ainda não existe.
            CONFIRME a descrição com o usuário antes de executar.
            """)
    public CategoriaResponseDto registrarCategoria(
            @ToolParam(description = "Descrição da categoria. Ex: 'Alimentação', 'Salário'") String descricao,
            @ToolParam(description = "Nome do ícone. Opcional, pode ser null") String icone) {
        log.info("[CHAT-AUDIT] user={} tool=registrarCategoria descricao={}",
                securityCtx.getEmail(), descricao);
        auditoria.registrar("registrarCategoria", "descricao=" + descricao);
        return categoriaService.criar(new CategoriaRequestDto(descricao, icone));
    }
}
