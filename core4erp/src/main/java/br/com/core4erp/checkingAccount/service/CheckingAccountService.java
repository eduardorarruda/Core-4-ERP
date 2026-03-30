package br.com.core4erp.checkingAccount.service;

import br.com.core4erp.checkingAccount.dto.CheckingAccountRequestDto;
import br.com.core4erp.checkingAccount.entity.CheckingAccount;
import br.com.core4erp.checkingAccount.repository.CheckingAccountRepository;
import br.com.core4erp.user.entity.User;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class CheckingAccountService {

    private final CheckingAccountRepository checkingAccountRepository;

    public CheckingAccountService(CheckingAccountRepository checkingAccountRepository){
        this.checkingAccountRepository = checkingAccountRepository;
    }

    public void createCheckingAccount(User user, CheckingAccountRequestDto request){

        CheckingAccount checkingAccount = new CheckingAccount();
        checkingAccount.setCheckingAccountAlias(request.getCheckingAccountAlias());
        checkingAccount.setDescription(request.getDescription());
        checkingAccount.setBalance(request.getBalance());
        checkingAccount.setUser(user);

        checkingAccountRepository.save(checkingAccount);

    }

    public void updateCheckingAccount(CheckingAccountRequestDto request){

        CheckingAccount checkingAccount = findByCheckingId(request.getCheckingAccountId());
        checkingAccount.setCheckingAccountAlias(request.getCheckingAccountAlias());
        checkingAccount.setDescription(request.getDescription());
        checkingAccount.setBalance(request.getBalance());

        checkingAccountRepository.save(checkingAccount);

    }

    public void deleteCheckingAccount(Long id){
        CheckingAccount checkingAccount = findByCheckingId(id);
        checkingAccountRepository.delete(checkingAccount);
    }


    public CheckingAccount findByCheckingId(Long id){
        Optional<CheckingAccount> checkingAccount = checkingAccountRepository.findById(id);
        if(checkingAccount.isEmpty())
            throw new RuntimeException("Conta bancaria nao encontrada");
        return checkingAccount.get();
    }
}
