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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

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
            Cadastra um parceiro (cliente, fornecedor ou ambos). Obrigatórios: razaoSocial, tipo e
            CPF/CNPJ (válido e único). Se o CPF/CNPJ não for informado, NÃO chame esta ferramenta —
            peça o documento ao usuário antes. Se já existir parceiro com o mesmo nome, o existente é
            reaproveitado (não duplica). Confirme antes de executar.
            """)
    public ParceiroResponseDto registrarParceiro(
            @ToolParam(description = "Razão social ou nome do parceiro") String razaoSocial,
            @ToolParam(description = "Tipo do parceiro: CLIENTE, FORNECEDOR ou AMBOS") String tipo,
            @ToolParam(description = "CPF ou CNPJ — OBRIGATÓRIO, válido") String cpfCnpj,
            @ToolParam(description = "Nome fantasia. Opcional, pode ser null") String nomeFantasia,
            @ToolParam(description = "Telefone. Opcional, pode ser null") String telefone,
            @ToolParam(description = "E-mail. Opcional, pode ser null") String email) {
        log.info("[CHAT-AUDIT] user={} tool=registrarParceiro razaoSocial={} tipo={}",
                securityCtx.getUsuarioId(), razaoSocial, tipo);
        auditoria.registrar("registrarParceiro", "razaoSocial=" + razaoSocial + " tipo=" + tipo);

        // Idempotência: se já existe parceiro com o mesmo nome, reaproveita em vez de duplicar.
        ParceiroResponseDto existente = parceiroService
                .listar(PageRequest.of(0, 500, Sort.by("razaoSocial"))).getContent().stream()
                .filter(p -> p.razaoSocial() != null && p.razaoSocial().equalsIgnoreCase(razaoSocial.strip()))
                .findFirst().orElse(null);
        if (existente != null) {
            log.info("[CHAT-AUDIT] registrarParceiro: reaproveitando parceiro existente id={}", existente.id());
            return existente;
        }

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
            Altera o TIPO de um parceiro existente (CLIENTE, FORNECEDOR ou AMBOS). Ex.: para lançar
            despesa a um parceiro que hoje é só CLIENTE, mude para AMBOS após confirmação.
            Obtenha o parceiroId via consultarParceiros.
            """)
    public ParceiroResponseDto atualizarTipoParceiro(
            @ToolParam(description = "ID do parceiro (use consultarParceiros para descobrir)") Long parceiroId,
            @ToolParam(description = "Novo tipo: CLIENTE, FORNECEDOR ou AMBOS") String tipo) {
        log.info("[CHAT-AUDIT] user={} tool=atualizarTipoParceiro parceiroId={} tipo={}",
                securityCtx.getUsuarioId(), parceiroId, tipo);
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
            Cadastra uma categoria de receita/despesa. Obrigatório: descricao (ícone opcional).
            Se já existir categoria com a mesma descrição, a existente é reaproveitada (não duplica).
            Confirme a descrição com o usuário antes de executar.
            """)
    public CategoriaResponseDto registrarCategoria(
            @ToolParam(description = "Descrição da categoria. Ex: 'Alimentação', 'Salário'") String descricao,
            @ToolParam(description = "Nome do ícone. Opcional, pode ser null") String icone) {
        log.info("[CHAT-AUDIT] user={} tool=registrarCategoria descricao={}",
                securityCtx.getUsuarioId(), descricao);
        auditoria.registrar("registrarCategoria", "descricao=" + descricao);

        // Idempotência: evita as duplicações observadas em produção (ex.: criar "Compras" e o
        // usuário confirmar de novo). Se já existe categoria com a mesma descrição, reaproveita.
        CategoriaResponseDto existente = categoriaService
                .listar(PageRequest.of(0, 500, Sort.by("descricao"))).getContent().stream()
                .filter(c -> c.descricao() != null && c.descricao().equalsIgnoreCase(descricao.strip()))
                .findFirst().orElse(null);
        if (existente != null) {
            log.info("[CHAT-AUDIT] registrarCategoria: reaproveitando categoria existente id={}", existente.id());
            return existente;
        }

        return categoriaService.criar(new CategoriaRequestDto(descricao, icone));
    }

    // ── Cadastro em LOTE (várias de uma vez) ──────────────────────────────────

    @Tool(description = """
            Cadastra VÁRIAS categorias de uma só vez (em lote). Use SEMPRE que o usuário pedir mais
            de uma categoria. Passe apenas as descrições — o ícone é escolhido automaticamente pelo
            sistema. Reaproveita as que já existem (não duplica). Confirme a lista antes de executar.
            """)
    public String registrarCategorias(
            @ToolParam(description = "Descrições das categorias. Ex: [\"Alimentação\",\"Mercado\",\"Combustível\"]")
            List<String> descricoes) {
        if (descricoes == null || descricoes.isEmpty()) return "Nenhuma categoria informada.";
        log.info("[CHAT-AUDIT] user={} tool=registrarCategorias qtd={}",
                securityCtx.getUsuarioId(), descricoes.size());
        auditoria.registrar("registrarCategorias", "qtd=" + descricoes.size());

        Set<String> existentes = categoriaService.listar(PageRequest.of(0, 500, Sort.by("descricao")))
                .getContent().stream()
                .map(c -> c.descricao() == null ? "" : c.descricao().strip().toLowerCase())
                .collect(Collectors.toSet());

        int criadas = 0, jaExistiam = 0, falhas = 0;
        List<String> erros = new ArrayList<>();
        for (String raw : descricoes) {
            if (raw == null || raw.isBlank()) continue;
            String descricao = raw.strip();
            if (existentes.contains(descricao.toLowerCase())) { jaExistiam++; continue; }
            try {
                categoriaService.criar(new CategoriaRequestDto(descricao, iconePara(descricao)));
                existentes.add(descricao.toLowerCase());
                criadas++;
            } catch (Exception e) {
                falhas++; erros.add(descricao + " (" + e.getMessage() + ")");
            }
        }
        StringBuilder sb = new StringBuilder(criadas + " categoria(s) criada(s)");
        if (jaExistiam > 0) sb.append(", ").append(jaExistiam).append(" já existia(m)");
        if (falhas > 0) sb.append(", ").append(falhas).append(" com erro: ").append(String.join("; ", erros));
        return sb.append(".").toString();
    }

    /** Item de parceiro para cadastro em lote. */
    public record NovoParceiro(
            @ToolParam(description = "Razão social ou nome do parceiro") String razaoSocial,
            @ToolParam(description = "CPF ou CNPJ — OBRIGATÓRIO e válido") String cpfCnpj,
            @ToolParam(description = "Tipo: CLIENTE, FORNECEDOR ou AMBOS (padrão FORNECEDOR)") String tipo,
            @ToolParam(description = "Nome fantasia (opcional)") String nomeFantasia) {}

    @Tool(description = """
            Cadastra VÁRIOS parceiros (fornecedores/clientes) de uma só vez (em lote). Use SEMPRE que
            o usuário pedir mais de um. CPF/CNPJ é OBRIGATÓRIO (válido e único) para cada um — se algum
            não tiver documento, peça ao usuário antes de cadastrar. tipo padrão é FORNECEDOR.
            Confirme a lista com o usuário antes de executar.
            """)
    public String registrarParceiros(
            @ToolParam(description = "Lista de parceiros a cadastrar") List<NovoParceiro> parceiros) {
        if (parceiros == null || parceiros.isEmpty()) return "Nenhum parceiro informado.";
        log.info("[CHAT-AUDIT] user={} tool=registrarParceiros qtd={}",
                securityCtx.getUsuarioId(), parceiros.size());
        auditoria.registrar("registrarParceiros", "qtd=" + parceiros.size());

        int criados = 0, falhas = 0;
        List<String> erros = new ArrayList<>();
        for (NovoParceiro p : parceiros) {
            if (p == null || p.razaoSocial() == null || p.razaoSocial().isBlank()) continue;
            TipoParceiro tipo;
            try {
                tipo = (p.tipo() == null || p.tipo().isBlank())
                        ? TipoParceiro.FORNECEDOR : TipoParceiro.valueOf(p.tipo().toUpperCase());
            } catch (IllegalArgumentException ex) {
                tipo = TipoParceiro.FORNECEDOR;
            }
            try {
                ParceiroRequestDto dto = new ParceiroRequestDto(
                        p.razaoSocial().strip(), p.nomeFantasia(), p.cpfCnpj(), tipo,
                        null, null, null, null, null, null, null, null, null);
                parceiroService.criar(dto);
                criados++;
            } catch (Exception e) {
                falhas++; erros.add(p.razaoSocial() + " (" + e.getMessage() + ")");
            }
        }
        StringBuilder sb = new StringBuilder(criados + " parceiro(s) criado(s)");
        if (falhas > 0) sb.append(", ").append(falhas).append(" com erro: ").append(String.join("; ", erros));
        return sb.append(".").toString();
    }

    /**
     * Escolhe um ícone (Lucide) adequado à descrição da categoria. Os nomes correspondem ao
     * conjunto suportado pelo frontend (IconDropdown). Padrão: "Receipt" (conta/boleto genérico).
     */
    private static String iconePara(String descricao) {
        String d = Normalizer.normalize(descricao, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase();
        if (d.contains("aliment") || d.contains("restaurante") || d.contains("comida")) return "Utensils";
        if (d.contains("mercado") || d.contains("supermerc")) return "ShoppingCart";
        if (d.contains("combust") || d.contains("gasolin") || d.contains("posto")) return "Fuel";
        if (d.contains("estacion")) return "CarFront";
        if (d.contains("transporte") || d.contains("uber") || d.contains("99") || d.contains("app")) return "Car";
        if (d.contains("condomin")) return "Building2";
        if (d.contains("agua")) return "Home";
        if (d.contains("energia") || d.contains("luz") || d.contains("eletric")) return "Zap";
        if (d.contains("gas")) return "Flame";
        if (d.contains("iptu")) return "Home";
        if (d.contains("aluguel") || d.contains("locac")) return "Key";
        if (d.contains("farmac") || d.contains("remedi")) return "Pill";
        if (d.contains("saude") || d.contains("medic") || d.contains("hospital")) return "Stethoscope";
        if (d.contains("internet") || d.contains("wifi") || d.contains("banda larga")) return "Wifi";
        if (d.contains("celular") || d.contains("telefone") || d.contains("movel")) return "Smartphone";
        if (d.contains("streaming") || d.contains("netflix") || d.contains("tv")) return "Tv";
        if (d.contains("seguro")) return "Briefcase";
        if (d.contains("emprest") || d.contains("financiamento")) return "Banknote";
        if (d.contains("ipva")) return "Car";
        if (d.contains("investiment") || d.contains("aplicac")) return "TrendingUp";
        if (d.contains("papelaria") || d.contains("livro")) return "BookOpen";
        if (d.contains("vestuario") || d.contains("roupa") || d.contains("calcado")) return "Shirt";
        if (d.contains("viagem") || d.contains("hotel") || d.contains("passagem")) return "Plane";
        if (d.contains("educac") || d.contains("escola") || d.contains("curso") || d.contains("faculdade")) return "GraduationCap";
        if (d.contains("lazer") || d.contains("jogo") || d.contains("entreten")) return "Gamepad2";
        if (d.contains("cafe")) return "Coffee";
        if (d.contains("academia") || d.contains("treino")) return "Dumbbell";
        if (d.contains("pet") || d.contains("cachorro") || d.contains("animal")) return "Dog";
        if (d.contains("presente") || d.contains("gift")) return "Gift";
        if (d.contains("salario") || d.contains("renda") || d.contains("receita")) return "DollarSign";
        return "Receipt";
    }
}
