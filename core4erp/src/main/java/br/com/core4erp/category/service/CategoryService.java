package br.com.core4erp.category.service;

import br.com.core4erp.category.entity.Category;
import br.com.core4erp.category.repository.CategoryRepository;
import br.com.core4erp.user.entity.User;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository){
        this.categoryRepository = categoryRepository;
    }

    public void createCategory(User user, String description){

        Category category = new Category();
        category.setDescription(description);
        category.setUser(user);

        categoryRepository.save(category);

    }

    public void deleteCategory(Long id){
        Category category = findCategoryById(id);
        categoryRepository.delete(category);
    }

    public void updateCategory(Long id, String description){
        Category category = findCategoryById(id);
        category.setDescription(description);
        categoryRepository.save(category);
    }

    public Category findCategoryById(Long id){
        Optional<Category> category = categoryRepository.findById(id);
        if(category.isEmpty())
            throw new RuntimeException("Categoria nao encontrada");
        return category.get();
    }

}
