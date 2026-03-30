package br.com.core4erp.financialEntry.repository;

import br.com.core4erp.financialEntry.entity.FinancialEntry;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FinancialEntryRepository extends JpaRepository<FinancialEntry, Long> {
}
