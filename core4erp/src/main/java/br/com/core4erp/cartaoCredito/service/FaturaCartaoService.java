package br.com.core4erp.cartaoCredito.service;

import br.com.core4erp.cartaoCredito.repository.FaturaCartaoRepository;
import br.com.core4erp.enums.StatusFatura;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FaturaCartaoService {

    private final FaturaCartaoRepository faturaCartaoRepository;

    public FaturaCartaoService(FaturaCartaoRepository faturaCartaoRepository) {
        this.faturaCartaoRepository = faturaCartaoRepository;
    }

    /** Called when a conta linked to a fatura is deleted — reopens and unlinks the fatura. */
    @Transactional
    public void reabrirEDesvincular(Long contaId) {
        faturaCartaoRepository.findByContaId(contaId).ifPresent(fatura -> {
            fatura.setStatus(StatusFatura.ABERTA);
            fatura.setConta(null);
            faturaCartaoRepository.save(fatura);
        });
    }

    /** Called when a conta payment is reversed — reopens the fatura without unlinking. */
    @Transactional
    public void reabrir(Long contaId) {
        faturaCartaoRepository.findByContaId(contaId).ifPresent(fatura -> {
            fatura.setStatus(StatusFatura.ABERTA);
            faturaCartaoRepository.save(fatura);
        });
    }
}
