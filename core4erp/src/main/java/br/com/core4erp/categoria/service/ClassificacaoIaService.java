package br.com.core4erp.categoria.service;

import br.com.core4erp.categoria.entity.Categoria;
import br.com.core4erp.categoria.repository.CategoriaRepository;
import br.com.core4erp.config.tenant.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Sugere automaticamente a categoria de um lançamento com base na sua descrição/parceiro,
 * usando o modelo de IA com saída estruturada. É estritamente uma SUGESTÃO: a decisão de
 * aplicar fica com o fluxo chamador (tool do chat aplica com confirmação; tela apenas exibe).
 *
 * <p><b>Isolamento por empresa:</b> o catálogo enviado ao modelo vem apenas das categorias
 * ATIVAS da empresa atual, e o id devolvido é revalidado contra esse mesmo catálogo — o modelo
 * nunca consegue apontar para uma categoria de outra empresa nem inventar um id.
 *
 * <p><b>Resiliência:</b> qualquer falha (modelo indisponível, JSON inválido, confiança baixa)
 * resulta em {@link Optional#empty()} — o lançamento segue sem categoria, nunca vira erro 500.
 */
@Service
public class ClassificacaoIaService {

    private static final Logger log = LoggerFactory.getLogger(ClassificacaoIaService.class);

    /** Confiança mínima para considerar a sugestão utilizável. */
    private static final double CONFIANCA_MINIMA = 0.5;

    /** Saída estruturada — Spring AI converte a resposta do modelo diretamente neste record. */
    public record SugestaoCategoria(Long categoriaId, String justificativa, double confianca) {}

    // @Lazy + build sob demanda quebra um ciclo de dependência: o ChatClient.Builder
    // (autoconfig do Spring AI) depende transitivamente das tools do chat, que por sua vez
    // dependem de CategoriaService/este serviço. Construir o cliente aqui no construtor
    // fecharia o ciclo na subida do contexto. Buildamos no 1º uso, com o contexto já pronto.
    private final ChatClient.Builder chatClientBuilder;
    private volatile ChatClient chatClient;
    private final CategoriaRepository categoriaRepository;
    private final TenantContext tenantCtx;

    public ClassificacaoIaService(@Lazy ChatClient.Builder chatClientBuilder,
                                  CategoriaRepository categoriaRepository,
                                  TenantContext tenantCtx) {
        this.chatClientBuilder = chatClientBuilder;
        this.categoriaRepository = categoriaRepository;
        this.tenantCtx = tenantCtx;
    }

    /** Cliente dedicado (sem tools) — só classifica. Buildado uma única vez, sob demanda. */
    private ChatClient chatClient() {
        ChatClient local = chatClient;
        if (local == null) {
            synchronized (this) {
                local = chatClient;
                if (local == null) {
                    local = chatClientBuilder.build();
                    chatClient = local;
                }
            }
        }
        return local;
    }

    public Optional<SugestaoCategoria> sugerir(String descricaoLancamento, String parceiroNome) {
        Long empresaId = tenantCtx.getEmpresaId();
        if (empresaId == null || descricaoLancamento == null || descricaoLancamento.isBlank()) {
            return Optional.empty();
        }

        List<Categoria> ativas = categoriaRepository.findByEmpresaIdAndAtivoTrue(empresaId);
        if (ativas.isEmpty()) return Optional.empty();

        String catalogo = ativas.stream()
                .map(c -> "- id=%d: %s%s".formatted(c.getId(), c.getDescricao(),
                        c.getCategoriaPai() != null ? " (subcategoria de " + c.getCategoriaPai().getDescricao() + ")" : ""))
                .collect(Collectors.joining("\n"));

        try {
            SugestaoCategoria s = chatClient().prompt()
                    .system("""
                            Você classifica lançamentos financeiros escolhendo EXATAMENTE UMA categoria
                            da lista fornecida. Responda com o id numérico exato de uma categoria da lista
                            — nunca invente um id fora da lista. Se nenhuma categoria se aplicar bem,
                            responda com confianca abaixo de 0.5. A confianca vai de 0.0 a 1.0.""")
                    .user("Lançamento: \"%s\" | Parceiro: \"%s\"\nCategorias disponíveis:\n%s"
                            .formatted(descricaoLancamento, parceiroNome == null ? "-" : parceiroNome, catalogo))
                    .call()
                    .entity(SugestaoCategoria.class);

            return avaliar(s, ativas);
        } catch (Exception e) {
            log.warn("[ClassificacaoIA] falha na sugestão — seguindo sem categoria. requestId={} motivo={}",
                    MDC.get("requestId"), e.getMessage());
            return Optional.empty(); // classificação é opcional: nunca derruba o lançamento
        }
    }

    /**
     * Guardrails da sugestão (testável sem o modelo): o id devolvido PRECISA existir no catálogo
     * ativo da empresa (IA não burla o tenant nem inventa id) e a confiança tem de atingir o mínimo.
     */
    Optional<SugestaoCategoria> avaliar(SugestaoCategoria s, List<Categoria> ativas) {
        boolean valido = s != null && s.categoriaId() != null
                && ativas.stream().anyMatch(c -> c.getId().equals(s.categoriaId()));
        return (valido && s.confianca() >= CONFIANCA_MINIMA) ? Optional.of(s) : Optional.empty();
    }
}
