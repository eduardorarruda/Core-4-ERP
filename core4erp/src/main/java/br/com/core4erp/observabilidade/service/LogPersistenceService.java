package br.com.core4erp.observabilidade.service;

import br.com.core4erp.observabilidade.entity.LogGeral;
import br.com.core4erp.observabilidade.entity.LogPerformance;
import br.com.core4erp.observabilidade.repository.LogGeralRepository;
import br.com.core4erp.observabilidade.repository.LogPerformanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LogPersistenceService {

    private final LogPerformanceRepository performanceRepo;
    private final LogGeralRepository logGeralRepo;

    @Async("logExecutor")
    @Transactional("logPerTransactionManager")
    public void salvarPerformance(LogPerformance entry) {
        try {
            performanceRepo.save(entry);
        } catch (Exception ex) {
            System.err.println("[LogPersistenceService] Falha ao salvar metrica de performance: " + ex.getMessage());
        }
    }

    @Async("logExecutor")
    @Transactional("logPerTransactionManager")
    public void salvarLog(LogGeral entry) {
        try {
            logGeralRepo.save(entry);
        } catch (Exception ex) {
            System.err.println("[LogPersistenceService] Falha ao salvar log geral: " + ex.getMessage());
        }
    }
}
