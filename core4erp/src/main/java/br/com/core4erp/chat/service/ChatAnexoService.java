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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
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

    private static final Set<String> EXTENSOES = Set.of("ofx", "xlsx", "xls", "csv");
    private static final long MAX_BYTES = 5L * 1024 * 1024; // 5 MB

    private final OfxParserService ofxParserService;
    private final ChatService chatService;
    private final RagService ragService;
    private final int maxChars;
    private final String n8nWebhookUrl;

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
    }

    public ChatResponseDto processarAnexo(MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new IllegalArgumentException("Nenhum arquivo foi enviado.");
        }
        if (arquivo.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("Arquivo muito grande (máximo 5 MB).");
        }
        String nome = arquivo.getOriginalFilename() != null ? arquivo.getOriginalFilename() : "arquivo";
        String ext = extensao(nome);
        if (!EXTENSOES.contains(ext)) {
            throw new IllegalArgumentException(
                    "Tipo de arquivo não suportado. Envie planilha (.xlsx, .xls, .csv) ou extrato bancário (.ofx).");
        }

        String conteudo = switch (ext) {
            case "ofx" -> extrairOfx(arquivo);
            case "csv" -> extrairTextoSimples(arquivo);
            default -> extrairExcel(arquivo);
        };

        boolean truncado = conteudo.length() >= maxChars;
        if (truncado) {
            conteudo = conteudo.substring(0, maxChars);
        }

        // Gancho n8n (processamento pesado/assíncrono) — habilitado quando a URL estiver configurada.
        if (n8nWebhookUrl != null && !n8nWebhookUrl.isBlank()) {
            log.info("[CHAT-ANEXO] n8n configurado — (futuro) delegar processamento de '{}' ao workflow", nome);
            // TODO Fase 3: despachar (nome, ext, conteúdo, token/empresa) ao webhook n8n e responder assíncrono.
        }

        String mensagem = """
                O usuário enviou um arquivo para você processar.
                Arquivo: "%s" (tipo: %s)%s

                Conteúdo extraído (estruturado):
                %s

                Tarefa: analise o conteúdo e execute o que for necessário usando suas ferramentas —
                por exemplo, cadastrar parceiros/categorias, registrar lançamentos/contas a pagar/receber,
                ou orientar a conciliação. Reaproveite o que já existe (não duplique). Ao final, responda
                com um RESUMO claro do que foi feito (quantos itens criados, o que ficou de fora e por quê).
                """.formatted(
                        nome, ext,
                        truncado ? " — ATENÇÃO: conteúdo truncado por tamanho; processe o que está abaixo e avise o usuário que parte ficou de fora." : "",
                        conteudo);

        log.info("[CHAT-ANEXO] processando '{}' ({}), {} chars{}", nome, ext, conteudo.length(),
                truncado ? " (truncado)" : "");

        // RAG: indexa o conteúdo do arquivo para que o usuário possa fazer perguntas sobre ele
        // depois (busca semântica). Não-fatal — falha aqui não impede o processamento principal.
        try {
            ragService.indexar(conteudo, "anexo", nome);
        } catch (Exception e) {
            log.warn("[CHAT-ANEXO] falha ao indexar '{}' no RAG (seguindo): {}", nome, e.getMessage());
        }

        return chatService.processar(new ChatRequestDto(mensagem));
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
                    if (sb.length() >= maxChars) break;
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
            return txt.length() > maxChars ? txt.substring(0, maxChars) : txt;
        } catch (Exception e) {
            throw new IllegalArgumentException("Não consegui ler o arquivo: " + e.getMessage());
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
