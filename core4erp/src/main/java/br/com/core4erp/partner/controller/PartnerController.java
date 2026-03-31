package br.com.core4erp.partner.controller;

import br.com.core4erp.partner.dto.PartnerRequestDto;
import br.com.core4erp.partner.service.PartnerService;
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
@RequestMapping("/partner")
public class PartnerController {

    private final PartnerService partnerService;
    private final UserService userService;

    public PartnerController(PartnerService partnerService,
                             UserService userService){
        this.partnerService = partnerService;
        this.userService = userService;
    }

    @PostMapping("/create")
    public ResponseEntity<?> createPartner(@Valid @RequestBody PartnerRequestDto request){
        try{
            User user = userService.getUserByAuthentication();
            partnerService.createPartner(user, request);
            return ResponseEntity.ok().build();
        }catch(Exception e){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @PostMapping("/update")
    public ResponseEntity<?> updatePartner(@Valid @RequestBody PartnerRequestDto request){
        try{
            partnerService.updatePartner(request);
            return ResponseEntity.ok().build();
        }catch (Exception e){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @PostMapping("/delete")
    public ResponseEntity<?> deletePartner(@Valid @RequestBody PartnerRequestDto request){
        try{
            partnerService.deletePartner(request.getPartnerId());
            return ResponseEntity.ok().build();
        }catch(Exception e){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

}
