package br.com.core4erp.plano.service;

import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.empresa.entity.Empresa;
import br.com.core4erp.empresa.repository.EmpresaRepository;
import br.com.core4erp.exception.BusinessException;
import br.com.core4erp.plano.dto.PagarPlanoRequestDto;
import br.com.core4erp.plano.dto.PagamentoResponseDto;
import br.com.core4erp.plano.entity.PagamentoMock;
import br.com.core4erp.plano.entity.Plano;
import br.com.core4erp.plano.gateway.GatewayPagamento;
import br.com.core4erp.plano.repository.PagamentoMockRepository;
import br.com.core4erp.plano.repository.PlanoRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PagamentoService {

    private final PagamentoMockRepository pagamentoRepository;
    private final EmpresaRepository empresaRepository;
    private final PlanoRepository planoRepository;
    private final GatewayPagamento gatewayPagamento;
    private final TenantContext tenantCtx;

    @Transactional
    @CacheEvict(value = "planos-ativos", allEntries = true)
    public PagamentoResponseDto pagar(PagarPlanoRequestDto dto) {
        Plano plano = planoRepository.findById(dto.planoId())
            .orElseThrow(() -> new EntityNotFoundException("Plano não encontrado"));

        if (!plano.getAtivo()) {
            throw new BusinessException("PLANO_INATIVO", "Este plano não está disponível");
        }

        GatewayPagamento.Resultado resultado = gatewayPagamento.processar(plano.getPrecoMensal(), dto.forma());

        PagamentoMock pagamento = new PagamentoMock();
        pagamento.setEmpresaId(tenantCtx.getEmpresaId());
        pagamento.setPlano(plano);
        pagamento.setValor(plano.getPrecoMensal());
        pagamento.setForma(dto.forma());
        pagamento.setReferencia(resultado.referencia());
        pagamento.setStatus(resultado.status());

        PagamentoMock salvo = pagamentoRepository.save(pagamento);

        if (resultado.status() == PagamentoMock.StatusPagamento.APROVADO) {
            Empresa empresa = empresaRepository.findById(tenantCtx.getEmpresaId())
                .orElseThrow(() -> new EntityNotFoundException("Empresa não encontrada"));
            empresa.setPlano(plano);
            empresa.setPlanoAtivoDe(LocalDateTime.now());
            empresa.setPlanoExpiraEm(LocalDateTime.now().plusMonths(1));
            empresaRepository.save(empresa);
        }

        log.info("Pagamento processado — empresaId={} planoId={} valor={} referencia={} status={}",
            tenantCtx.getEmpresaId(), dto.planoId(), plano.getPrecoMensal(),
            resultado.referencia(), resultado.status());

        return toDto(salvo);
    }

    public Page<PagamentoResponseDto> historico(Pageable pageable) {
        return pagamentoRepository
            .findByEmpresaIdOrderByCreatedDateDesc(tenantCtx.getEmpresaId(), pageable)
            .map(this::toDto);
    }

    private PagamentoResponseDto toDto(PagamentoMock p) {
        return new PagamentoResponseDto(
            p.getId(), p.getPlano().getNome(), p.getValor(),
            p.getStatus().name(), p.getForma(), p.getCreatedDate()
        );
    }
}
