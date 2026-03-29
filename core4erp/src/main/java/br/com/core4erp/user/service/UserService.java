package br.com.core4erp.user.service;

import br.com.core4erp.auth.service.AuthService;
import br.com.core4erp.user.dto.UserRegisterRequestDto;
import br.com.core4erp.user.entity.User;
import br.com.core4erp.user.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final AuthService authService;

    public UserService(UserRepository userRepository,
                       AuthService authService){
        this.userRepository = userRepository;
        this.authService = authService;
    }

    public Boolean registerAccount(UserRegisterRequestDto request) {
        try{

            Optional<User> usernameExists = userRepository.findByName(request.getName());
            if(usernameExists.isPresent())
                throw new RuntimeException("Usuário já cadastrado");

            User user = new User();
            user.setName(request.getName());
            user.setEmail(request.getEmail());
            user.setPhoneNumber(request.getPhoneNumber());

            user = userRepository.save(user);

            authService.register(user, request.getUsername(), request.getPassword(), request.getRole());
            return true;

        }catch(Exception e){

            return false;

        }

    }
}
