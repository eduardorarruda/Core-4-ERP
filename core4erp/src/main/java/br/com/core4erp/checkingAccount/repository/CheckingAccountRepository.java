package br.com.core4erp.checkingAccount.repository;

import br.com.core4erp.checkingAccount.entity.CheckingAccount;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CheckingAccountRepository extends JpaRepository<CheckingAccount, Long> {
}
