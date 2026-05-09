package br.com.core4erp.observabilidade.service;

import br.com.core4erp.observabilidade.entity.LogGeral;
import br.com.core4erp.observabilidade.entity.LogPerformance;
import br.com.core4erp.observabilidade.repository.LogGeralRepository;
import br.com.core4erp.observabilidade.repository.LogPerformanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

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
            // System.err intencional: usar SLF4J aqui criaria loop infinito (logger → DatabaseLogAppender → este método)
            System.err.println("[LogPersistenceService] Falha ao salvar metrica de performance: " + ex.getMessage());
        }
    }

    @Async("logExecutor")
    @Transactional("logPerTransactionManager")
    public void salvarLogs(List<LogGeral> entries) {
        try {
            logGeralRepo.saveAll(entries);
        } catch (Exception ex) {
            // System.err intencional: usar SLF4J aqui criaria loop infinito (logger → DatabaseLogAppender → este método)
            System.err.println("[LogPersistenceService] Falha ao salvar batch de logs: " + ex.getMessage());
        }
    }
}
