package br.com.core4erp.category.controller;

import br.com.core4erp.category.dto.CategoryRequestDto;
import br.com.core4erp.category.service.CategoryService;
import br.com.core4erp.user.entity.User;
import br.com.core4erp.user.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/category")
public class CategoryController {

    private final CategoryService categoryService;
    private final UserRepository userRepositoty;

    public CategoryController(CategoryService categoryService,
                              UserRepository userRepository){
        this.categoryService = categoryService;
        this.userRepositoty = userRepository;
    }

    @PostMapping("/create")
    public ResponseEntity<?> createCategory(@Valid @RequestBody CategoryRequestDto request){
        try{
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            Optional<User> user = userRepositoty.findByName(authentication.getName());
            if(user.isEmpty())
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();

            categoryService.createCategory(user.get(), request.getDescription());
            return ResponseEntity.ok().build();

        }catch(Exception e){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @PostMapping("/update")
    public ResponseEntity<?> updateCategory(@Valid @RequestBody CategoryRequestDto request){
        try{
            categoryService.updateCategory(request.getId(), request.getDescription());
            return ResponseEntity.ok().build();

        }catch(Exception e){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @PostMapping("/delete")
    public ResponseEntity<?> deleteCategory(@Valid @RequestBody CategoryRequestDto request){
        try{
            categoryService.deleteCategory(request.getId());
            return ResponseEntity.ok().build();

        }catch(Exception e){
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }
}
