package br.com.core4erp.creditCardTransaction.repository;

import br.com.core4erp.creditCardTransaction.entity.CreditCardTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CreditCardTransactionRepository extends JpaRepository<CreditCardTransaction, Long> {
}
