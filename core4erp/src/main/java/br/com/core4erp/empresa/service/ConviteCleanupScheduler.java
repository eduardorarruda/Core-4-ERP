package br.com.core4erp.empresa.service;

import br.com.core4erp.empresa.entity.Convite;
import br.com.core4erp.empresa.repository.ConviteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ConviteCleanupScheduler {

    private final ConviteRepository conviteRepository;

    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void limparExpirados() {
        List<Convite> expirados = conviteRepository
            .findByAceitoFalseAndExpiraEmBefore(LocalDateTime.now());
        int total = expirados.size();
        conviteRepository.deleteAll(expirados);
        log.info("Convites expirados removidos: {}", total);
    }
}
