package br.com.core4erp.busca.service;

import br.com.core4erp.busca.dto.BuscaResultadoDto;
import br.com.core4erp.cartaoCredito.entity.LancamentoCartao;
import br.com.core4erp.cartaoCredito.repository.LancamentoCartaoRepository;
import br.com.core4erp.conta.entity.Conta;
import br.com.core4erp.conta.repository.ContaRepository;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.parceiro.entity.Parceiro;
import br.com.core4erp.parceiro.repository.ParceiroRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Busca global do cabeçalho: consulta parceiros, contas e lançamentos de cartão
 * da empresa do usuário. Isolada por empresaId (multi-tenancy) e limitada pelas
 * permissões RBAC de cada tipo de registro (defense-in-depth).
 */
@Service
public class BuscaService {

    /** Mínimo de caracteres para disparar a busca. */
    private static final int MIN_TERMO = 2;
    /** Máximo de resultados por tipo. */
    private static final int LIMITE_POR_TIPO = 5;

    private final TenantContext tenantCtx;
    private final ParceiroRepository parceiroRepo;
    private final ContaRepository contaRepo;
    private final LancamentoCartaoRepository lancamentoRepo;

    public BuscaService(TenantContext tenantCtx,
                        ParceiroRepository parceiroRepo,
                        ContaRepository contaRepo,
                        LancamentoCartaoRepository lancamentoRepo) {
        this.tenantCtx = tenantCtx;
        this.parceiroRepo = parceiroRepo;
        this.contaRepo = contaRepo;
        this.lancamentoRepo = lancamentoRepo;
    }

    @Transactional(readOnly = true)
    public List<BuscaResultadoDto> buscar(String termo) {
        if (termo == null || termo.trim().length() < MIN_TERMO) {
            return List.of();
        }
        String q = termo.trim();
        Long eid = tenantCtx.getEmpresaId();
        Pageable limite = PageRequest.of(0, LIMITE_POR_TIPO);
        List<BuscaResultadoDto> resultados = new ArrayList<>();

        if (pode("PARCEIRO_VISUALIZAR")) {
            for (Parceiro p : parceiroRepo.buscar(eid, q, limite)) {
                String titulo = (p.getRazaoSocial() != null && !p.getRazaoSocial().isBlank())
                        ? p.getRazaoSocial() : p.getNomeFantasia();
                resultados.add(new BuscaResultadoDto("PARCEIRO", p.getId(), titulo, p.getCpfCnpj(), "/parceiros"));
            }
        }

        if (pode("CONTA_VISUALIZAR")) {
            for (Conta c : contaRepo.buscarPorDescricao(eid, q, limite)) {
                String subtitulo = c.getTipo() != null && "PAGAR".equals(c.getTipo().name())
                        ? "Conta a pagar" : "Conta a receber";
                resultados.add(new BuscaResultadoDto("CONTA", c.getId(), c.getDescricao(), subtitulo, "/contas"));
            }
        }

        if (pode("CARTAO_VISUALIZAR") || pode("CARTAO_LANCAR")) {
            for (LancamentoCartao l : lancamentoRepo.buscarPorDescricao(eid, q, limite)) {
                resultados.add(new BuscaResultadoDto("LANCAMENTO_CARTAO", l.getId(),
                        l.getDescricao(), "Lançamento de cartão", "/cartoes"));
            }
        }

        return resultados;
    }

    /** adminSistema tem acesso irrestrito; usuário regular depende da permissão. */
    private boolean pode(String codigo) {
        return tenantCtx.isAdminSistema() || tenantCtx.temPermissao(codigo);
    }
}
