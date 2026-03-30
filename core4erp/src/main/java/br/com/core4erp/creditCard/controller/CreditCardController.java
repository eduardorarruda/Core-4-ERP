package br.com.core4erp.creditCard.controller;

import br.com.core4erp.creditCard.dto.CreditCardRequestDto;
import br.com.core4erp.creditCard.service.CreditCardService;
import br.com.core4erp.user.entity.User;
import br.com.core4erp.user.repository.UserRepository;
import br.com.core4erp.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/credit-card")
public class CreditCardController {

    private final UserRepository userRepository;
    private final CreditCardService creditCardService;
    private final UserService userService;

    public CreditCardController(UserRepository userRepository,
                                CreditCardService creditCardService,
                                UserService userService){
        this.userRepository = userRepository;
        this.creditCardService = creditCardService;
        this.userService = userService;
    }

    @PostMapping("/create")
    public ResponseEntity<?> createCreditCard(@Valid @RequestBody CreditCardRequestDto request){
        try{

            User user = userService.getUserByAuthentication();
            creditCardService.createCreditCard(user, request);
            return ResponseEntity.ok().build();

        }catch(Exception e){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

    }

    @PostMapping("/update")
    public ResponseEntity<?> updateCreditCard(@Valid @RequestBody CreditCardRequestDto request){
        try{
            creditCardService.updateCreditCard(request);
            return ResponseEntity.ok().build();

        }catch(Exception e){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @PostMapping("/delete")
    public ResponseEntity<?> deleteCreditCard(@Valid @RequestBody CreditCardRequestDto request){
        try{
            creditCardService.deleteCreditCard(request.getCreditCardId());
            return ResponseEntity.ok().build();
        }catch (Exception e){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

}
