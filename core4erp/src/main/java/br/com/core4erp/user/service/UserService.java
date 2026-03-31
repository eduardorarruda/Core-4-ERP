package br.com.core4erp.user.service;

import br.com.core4erp.auth.entity.Auth;
import br.com.core4erp.auth.repository.AuthRepository;
import br.com.core4erp.auth.service.AuthService;
import br.com.core4erp.user.dto.UserRegisterRequestDto;
import br.com.core4erp.user.dto.UserResponseDto;
import br.com.core4erp.user.dto.UserUpdateRequestDto;
import br.com.core4erp.user.entity.User;
import br.com.core4erp.user.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final AuthService authService;
    private final AuthRepository authRepository;

    public UserService(UserRepository userRepository,
                       AuthService authService,
                       AuthRepository authRepository){
        this.userRepository = userRepository;
        this.authService = authService;
        this.authRepository = authRepository;
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

    public void updateUser(UserUpdateRequestDto request){

        User user = findUserByUsername(request.getUsername());

        user.setPhoneNumber(request.getNewPhoneNumber());
        user.setName(request.getNewName());
        user.setEmail(request.getNewEmail());
        userRepository.save(user);

    }

    public void deleteUserByUsername(String username){

        User user = findUserByUsername(username);
        userRepository.delete(user);

    }


    private User findUserByUsername(String username){

        Optional<Auth> auth = authRepository.findByUsername(username);
        if(auth.isEmpty())
            throw new RuntimeException("Usuário não encontrado");
        return auth.get().getUser();

    }

    public User getUserByAuthentication(){
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Optional<User> user = userRepository.findByName(authentication.getName());
        if(user.isEmpty())
            throw new RuntimeException("Usuario nao encontrado");
        return user.get();
    }

    public List<UserResponseDto> listAllUsers(){
        List<User> users = userRepository.findAll();
        List<UserResponseDto> responseDtoList = new ArrayList<>();
        for(User user : users){
            UserResponseDto dto = new UserResponseDto();
            dto.setId(user.getId());
            dto.setName(user.getName());
            dto.setEmail(user.getEmail());
            dto.setPhoneNumber(user.getPhoneNumber());

            responseDtoList.add(dto);
        }
        return responseDtoList;
    }

    public UserResponseDto listUserByUsername(String username){
        User user = findUserByUsername(username);
        UserResponseDto dto = new UserResponseDto();
        dto.setId(user.getId());
        dto.setPhoneNumber(user.getPhoneNumber());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setPhoneNumber(user.getPhoneNumber());

        return dto;
    }

}
