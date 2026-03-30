package br.com.core4erp.checkingAccount.service;

import br.com.core4erp.checkingAccount.entity.CheckingAccount;
import br.com.core4erp.checkingAccount.repository.CheckingAccountRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class CheckingAccountService {

    private final CheckingAccountRepository checkingAccountRepository;

    public CheckingAccountService(CheckingAccountRepository checkingAccountRepository){
        this.checkingAccountRepository = checkingAccountRepository;
    }

    public CheckingAccount findByCheckingId(Long id){
        Optional<CheckingAccount> checkingAccount = checkingAccountRepository.findById(id);
        if(checkingAccount.isEmpty())
            throw new RuntimeException("Conta bancaria nao encontrada");
        return checkingAccount.get();
    }
}
