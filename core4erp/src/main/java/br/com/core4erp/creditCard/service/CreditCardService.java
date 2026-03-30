package br.com.core4erp.creditCard.service;

import br.com.core4erp.checkingAccount.entity.CheckingAccount;
import br.com.core4erp.checkingAccount.service.CheckingAccountService;
import br.com.core4erp.creditCard.dto.CreditCardRequestDto;
import br.com.core4erp.creditCard.entity.CreditCard;
import br.com.core4erp.creditCard.repository.CreditCardRepository;
import br.com.core4erp.user.entity.User;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class CreditCardService {

    private final CreditCardRepository creditCardRepository;
    private final CheckingAccountService checkingAccountService;

    public CreditCardService(CreditCardRepository creditCardRepository,
                             CheckingAccountService checkingAccountService){
        this.creditCardRepository = creditCardRepository;
        this.checkingAccountService = checkingAccountService;
    }


    public void createCreditCard(User user, CreditCardRequestDto request){

        CheckingAccount checkingAccount = checkingAccountService.findByCheckingId(request.getCheckingAccount());

        CreditCard creditCard = new CreditCard();
        creditCard.setCreditCardName(request.getCreditCardName());
        creditCard.setLimitAmount(request.getLimitAmount());
        creditCard.setClosingDay(request.getClosingDay());
        creditCard.setDueDay(request.getDueDay());
        creditCard.setUser(user);
        creditCard.setCheckingAccount(checkingAccount);

        creditCardRepository.save(creditCard);

    }

    public void updateCreditCard(CreditCardRequestDto request){

        CreditCard creditCard = findCreditCardById(request.getCreditCardId());
        CheckingAccount checkingAccount = checkingAccountService.findByCheckingId(request.getCheckingAccount());

        creditCard.setCreditCardName(request.getCreditCardName());
        creditCard.setLimitAmount(request.getLimitAmount());
        creditCard.setClosingDay(request.getClosingDay());
        creditCard.setDueDay(request.getDueDay());
        creditCard.setCheckingAccount(checkingAccount);

        creditCardRepository.save(creditCard);

    }

    public void deleteCreditCard(Long id){

        CreditCard creditCard = findCreditCardById(id);
        creditCardRepository.delete(creditCard);

    }

    private CreditCard findCreditCardById(Long id){
        Optional<CreditCard> creditCardOptional = creditCardRepository.findById(id);
        if(creditCardOptional.isEmpty())
            throw new RuntimeException("Cartao de credito nao foi encontrado");
        return creditCardOptional.get();
    }

}
