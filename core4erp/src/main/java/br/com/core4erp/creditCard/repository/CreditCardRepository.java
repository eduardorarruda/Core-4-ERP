package br.com.core4erp.creditCard.repository;

import br.com.core4erp.creditCard.entity.CreditCard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CreditCardRepository extends JpaRepository<CreditCard, Long> {

    Optional<CreditCard> findByCreditCardName(String creditCardName);

}
