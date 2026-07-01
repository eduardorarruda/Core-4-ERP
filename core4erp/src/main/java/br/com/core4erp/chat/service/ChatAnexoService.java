package br.com.core4erp.chat.service;

import br.com.core4erp.chat.dto.ChatRequestDto;
import br.com.core4erp.chat.dto.ChatResponseDto;
import br.com.core4erp.conciliacao.service.OfxDadosDto;
import br.com.core4erp.conciliacao.service.OfxParserService;
import br.com.core4erp.conciliacao.service.OfxTransacaoDto;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Processa arquivos anexados no chat (planilhas e OFX). Extrai o conteúdo de forma estruturada e
 * entrega ao assistente (que usa suas ferramentas para cadastrar/lançar/conciliar conforme o caso).
 *
 * <p><b>MVP em processo:</b> arquivos pequenos são analisados aqui mesmo, reaproveitando o
 * {@link ChatService} (gpt-4o + tools). Para volumes maiores / processamento pesado, há o gancho
 * {@code chat.n8n.webhook-url}: quando configurado, o processamento será delegado a um workflow
 * n8n (assíncrono) em vez de rodar em processo. O limite de caracteres existe porque o conteúdo
 * vira mensagem do chat (custo de tokens) — acima disso, é caso de usar o n8n.
 */
@Service
public class ChatAnexoService {

    private static final Logger log = LoggerFactory.getLogger(ChatAnexoService.class);

    private static final Set<String> EXTENSOES = Set.of("ofx", "xlsx", "xls", "csv", "pdf");
    private static final long MAX_BYTES = 5L * 1024 * 1024; // 5 MB
    // Teto de segurança da extração (alinhado ao limite do RAG). O conteúdo COMPLETO (até aqui) vai
    // para o RAG; para a IA enviamos no máximo {@code maxChars} (custo de tokens).
    private static final int MAX_EXTRACT_CHARS = 100_000;

    private final OfxParserService ofxParserService;
    private final ChatService chatService;
    private final RagService ragService;
    private final int maxChars;
    private final String n8nWebhookUrl;
    private final RestClient n8nClient;

    public ChatAnexoService(OfxParserService ofxParserService,
                            ChatService chatService,
                            RagService ragService,
                            @Value("${chat.anexo.max-chars:3000}") int maxChars,
                            @Value("${chat.n8n.webhook-url:}") String n8nWebhookUrl) {
        this.ofxParserService = ofxParserService;
        this.chatService = chatService;
        this.ragService = ragService;
        this.maxChars = maxChars;
        this.n8nWebhookUrl = n8nWebhookUrl;
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(3_000);
        f.setReadTimeout(15_000);
        this.n8nClient = RestClient.builder().requestFactory(f).build();
    }

    /**
     * Etapa de ingestão via n8n: quando {@code chat.n8n.webhook-url} está configurado, envia o
     * conteúdo ao workflow de pré-processamento (limpeza/normalização) e usa o texto retornado para
     * indexar no RAG. Best-effort — se o n8n não estiver configurado, demorar ou falhar, devolve o
     * conteúdo original (a ingestão nunca depende do n8n estar de pé).
     */
    @SuppressWarnings("unchecked")
    private String preprocessarComN8n(String conteudo, String fonte) {
        if (n8nWebhookUrl == null || n8nWebhookUrl.isBlank()) return conteudo;
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("texto", conteudo);
            body.put("tipo", "anexo");
            body.put("fonte", fonte);
            Map<String, Object> resp = n8nClient.post()
                    .uri(n8nWebhookUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
            Object texto = resp == null ? null : resp.get("texto");
            if (texto instanceof String s && !s.isBlank()) {
                log.info("[CHAT-ANEXO] n8n pré-processou '{}' ({} → {} chars)", fonte, conteudo.length(), s.length());
                return s;
            }
            log.warn("[CHAT-ANEXO] n8n não retornou 'texto' para '{}' — indexando conteúdo original", fonte);
            return conteudo;
        } catch (Exception e) {
            log.warn("[CHAT-ANEXO] falha ao chamar n8n para '{}' (indexando original): {}", fonte, e.getMessage());
            return conteudo;
        }
    }

    public ChatResponseDto processarAnexo(MultipartFile arquivo, String mensagemUsuario) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new IllegalArgumentException("Nenhum arquivo foi enviado.");
        }
        if (mensagemUsuario == null || mensagemUsuario.isBlank()) {
            throw new IllegalArgumentException(
                    "Descreva o que você quer que eu faça com o arquivo (ex.: \"cadastre todas as contas deste extrato\").");
        }
        String instrucao = mensagemUsuario.strip();
        if (arquivo.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("Arquivo muito grande (máximo 5 MB).");
        }
        String nome = arquivo.getOriginalFilename() != null ? arquivo.getOriginalFilename() : "arquivo";
        String ext = extensao(nome);
        if (!EXTENSOES.contains(ext)) {
            throw new IllegalArgumentException(
                    "Tipo de arquivo não suportado. Envie planilha (.xlsx, .xls, .csv), extrato bancário (.ofx) ou documento (.pdf).");
        }

        // Conteúdo COMPLETO extraído (até o teto de segurança) — usado para indexar no RAG.
        String conteudoCompleto = switch (ext) {
            case "ofx" -> extrairOfx(arquivo);
            case "csv", "pdf" -> ext.equals("pdf") ? extrairPdf(arquivo) : extrairTextoSimples(arquivo);
            default -> extrairExcel(arquivo);
        };

        // Para a IA enviamos no máximo maxChars (custo de tokens); o RAG recebe o conteúdo completo.
        boolean truncado = conteudoCompleto.length() > maxChars;
        String conteudo = truncado ? conteudoCompleto.substring(0, maxChars) : conteudoCompleto;

        String mensagem = """
                O usuário enviou um arquivo com uma instrução do que fazer.

                INSTRUÇÃO DO USUÁRIO (siga isto acima de tudo):
                "%s"

                Arquivo: "%s" (tipo: %s)%s

                Conteúdo extraído (estruturado):
                %s

                Tarefa: cumpra a INSTRUÇÃO DO USUÁRIO usando o conteúdo acima e suas ferramentas —
                por exemplo, cadastrar parceiros/categorias, registrar lançamentos/contas a pagar/receber,
                ou orientar a conciliação. Reaproveite o que já existe (não duplique). Confirme antes de
                operações que mexem em dinheiro, conforme suas regras. Ao final, responda com um RESUMO
                claro do que foi feito (quantos itens criados, o que ficou de fora e por quê).
                """.formatted(
                        instrucao, nome, ext,
                        truncado ? " — ATENÇÃO: conteúdo truncado por tamanho; processe o que está abaixo e avise o usuário que parte ficou de fora." : "",
                        conteudo);

        log.info("[CHAT-ANEXO] processando '{}' ({}), {} chars{} — instrucao='{}'", nome, ext, conteudo.length(),
                truncado ? " (truncado)" : "", instrucao.length() > 80 ? instrucao.substring(0, 80) + "…" : instrucao);

        // Ingestão no RAG: opcionalmente passa o conteúdo por um workflow n8n de pré-processamento
        // (limpeza/normalização) antes de indexar; se o n8n não estiver configurado ou falhar, indexa
        // o conteúdo original. Tudo dentro da requisição autenticada (tenant preservado).
        String paraIndexar = preprocessarComN8n(conteudoCompleto, nome);

        // Indexa o conteúdo COMPLETO (não o truncado para a IA), para busca semântica posterior.
        // Não-fatal — falha aqui não impede o fluxo.
        try {
            ragService.indexar(paraIndexar, "anexo", nome);
        } catch (Exception e) {
            log.warn("[CHAT-ANEXO] falha ao indexar '{}' no RAG (seguindo): {}", nome, e.getMessage());
        }

        // A IA recebe o conteúdo completo agora, mas no histórico guardamos só um resumo curto
        // (o arquivo inteiro no histórico inflaria o prompt das próximas mensagens → 429).
        String resumoHistorico = "[Enviei o arquivo \"" + nome + "\" e pedi: " + instrucao + "]";
        return chatService.processar(new ChatRequestDto(mensagem), resumoHistorico);
    }

    // ── Extração ──────────────────────────────────────────────────────────────

    private String extrairOfx(MultipartFile arquivo) {
        try {
            OfxDadosDto d = ofxParserService.parse(arquivo);
            StringBuilder sb = new StringBuilder();
            sb.append("Extrato OFX — banco=").append(nvl(d.getBancoId()))
              .append(" agência=").append(nvl(d.getAgencia()))
              .append(" conta=").append(nvl(d.getNumeroConta()))
              .append(" período=").append(nvl(d.getDataInicio())).append(" a ").append(nvl(d.getDataFim()))
              .append("\nTransações (data | valor | descrição):\n");
            if (d.getTransacoes() != null) {
                for (OfxTransacaoDto t : d.getTransacoes()) {
                    String desc = t.getNome() != null && !t.getNome().isBlank() ? t.getNome() : nvl(t.getMemo());
                    sb.append("- ").append(nvl(t.getData())).append(" | ")
                      .append(t.getValor() != null ? t.getValor() : BigDecimal.ZERO).append(" | ")
                      .append(desc).append("\n");
                    if (sb.length() >= MAX_EXTRACT_CHARS) break;
                }
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalArgumentException("Não consegui ler o arquivo OFX: " + e.getMessage());
        }
    }

    private String extrairExcel(MultipartFile arquivo) {
        try (InputStream in = arquivo.getInputStream();
             Workbook wb = WorkbookFactory.create(in)) {
            DataFormatter fmt = new DataFormatter(new Locale("pt", "BR"));
            StringBuilder sb = new StringBuilder();
            Sheet sheet = wb.getNumberOfSheets() > 0 ? wb.getSheetAt(0) : null;
            if (sheet == null) return "(planilha vazia)";
            for (Row row : sheet) {
                StringBuilder linha = new StringBuilder();
                for (Cell cell : row) {
                    String v = fmt.formatCellValue(cell).strip();
                    linha.append(v).append("\t");
                }
                String l = linha.toString().strip();
                if (!l.isBlank()) sb.append(l).append("\n");
                if (sb.length() >= maxChars) break;
            }
            return sb.length() == 0 ? "(planilha sem dados)" : sb.toString();
        } catch (Exception e) {
            throw new IllegalArgumentException("Não consegui ler a planilha: " + e.getMessage());
        }
    }

    private String extrairTextoSimples(MultipartFile arquivo) {
        try {
            String txt = new String(arquivo.getBytes(), StandardCharsets.UTF_8);
            return txt.length() > MAX_EXTRACT_CHARS ? txt.substring(0, MAX_EXTRACT_CHARS) : txt;
        } catch (Exception e) {
            throw new IllegalArgumentException("Não consegui ler o arquivo: " + e.getMessage());
        }
    }

    private String extrairPdf(MultipartFile arquivo) {
        try (PDDocument doc = Loader.loadPDF(arquivo.getBytes())) {
            String txt = new PDFTextStripper().getText(doc).strip();
            if (txt.isBlank()) return "(PDF sem texto extraível — pode ser um documento digitalizado/imagem)";
            return txt.length() > MAX_EXTRACT_CHARS ? txt.substring(0, MAX_EXTRACT_CHARS) : txt;
        } catch (Exception e) {
            throw new IllegalArgumentException("Não consegui ler o PDF: " + e.getMessage());
        }
    }

    private static String extensao(String nome) {
        int p = nome.lastIndexOf('.');
        return p >= 0 ? nome.substring(p + 1).toLowerCase(Locale.ROOT) : "";
    }

    private static String nvl(Object o) {
        return o == null ? "" : o.toString();
    }
}
