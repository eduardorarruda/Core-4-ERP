package br.com.core4erp.user.controller;

import br.com.core4erp.user.dto.UserRegisterRequestDto;
import br.com.core4erp.user.dto.UserResponseDto;
import br.com.core4erp.user.dto.UserUpdateRequestDto;
import br.com.core4erp.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/user")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody UserRegisterRequestDto request){
        try{
            Boolean created = userService.registerAccount(request);
            if(created)
                return ResponseEntity.ok().build();
            return new ResponseEntity<>(HttpStatus.NOT_ACCEPTABLE);
        }catch(Exception e){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @PostMapping("/update")
    public ResponseEntity<?> update(@Valid @RequestBody UserUpdateRequestDto request){
        try{
            userService.updateUser(request);
            return ResponseEntity.ok().build();
        }catch(Exception e){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @PostMapping("/delete")
    public ResponseEntity<?> deleteByUsername(@Valid @RequestParam String username){
        try{
            userService.deleteUserByUsername(username);
            return ResponseEntity.ok().build();
        }catch (Exception e){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @GetMapping("/listAll")
    public ResponseEntity<List<UserResponseDto>> listAllUsers(){
        try{
            return ResponseEntity.ok(userService.listAllUsers());
        }catch(Exception e){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @GetMapping("/list")
    public ResponseEntity<UserResponseDto> listUserByUsername(@Valid @RequestParam String username){
        try{
            return ResponseEntity.ok(userService.listUserByUsername(username));
        }catch (Exception e){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }
}
