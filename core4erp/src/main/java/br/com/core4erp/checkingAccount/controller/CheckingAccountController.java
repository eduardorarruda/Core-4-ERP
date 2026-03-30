package br.com.core4erp.checkingAccount.controller;

import br.com.core4erp.checkingAccount.dto.CheckingAccountRequestDto;
import br.com.core4erp.checkingAccount.service.CheckingAccountService;
import br.com.core4erp.user.entity.User;
import br.com.core4erp.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/checking-account")
public class CheckingAccountController {

    private final CheckingAccountService checkingAccountService;
    private final UserService userService;

    public CheckingAccountController(CheckingAccountService checkingAccountService,
                                     UserService userService){
        this.checkingAccountService = checkingAccountService;
        this.userService = userService;
    }

    @PostMapping("/create")
    public ResponseEntity<?> createCheckingAccount(@Valid @RequestBody CheckingAccountRequestDto request){
        try{
            User user = userService.getUserByAuthentication();
            checkingAccountService.createCheckingAccount(user, request);
            return ResponseEntity.ok().build();

        }catch(Exception e){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @PostMapping("/update")
    public ResponseEntity<?> updateCheckingAccount(@Valid @RequestBody CheckingAccountRequestDto request){
        try{
            checkingAccountService.updateCheckingAccount(request);
            return ResponseEntity.ok().build();
        }catch(Exception e){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @PostMapping("/delete")
    public ResponseEntity<?> deleteCheckingAccount(@Valid @RequestBody CheckingAccountRequestDto request){
        try{
            checkingAccountService.deleteCheckingAccount(request.getCheckingAccountId());
            return ResponseEntity.ok().build();
        }catch(Exception e){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

}
