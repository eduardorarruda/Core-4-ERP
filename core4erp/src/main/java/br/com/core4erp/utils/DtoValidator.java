package br.com.core4erp.utils;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.stream.Collectors;

/**
 * Valida um DTO aplicando as regras de Bean Validation (@NotBlank, @NotNull, @Size, ...) em qualquer
 * camada — não só no controller.
 *
 * <p><b>Por que existe:</b> o {@code @Valid} do Spring MVC só roda no controller. As ferramentas do
 * chat IA chamam os services DIRETAMENTE, então sem isto elas conseguiriam criar registros que
 * violam as regras de negócio (ex.: parceiro sem CPF/CNPJ). Chamar {@link #validar(Object)} no início
 * dos métodos de criar/atualizar dos services garante a mesma regra para o usuário e para a IA
 * (defense-in-depth).
 */
@Component
public class DtoValidator {

    private final Validator validator;

    public DtoValidator(Validator validator) {
        this.validator = validator;
    }

    /** Lança {@link IllegalArgumentException} (→ HTTP 400) com as mensagens das regras violadas. */
    public <T> void validar(T dto) {
        validar(dto, Set.of());
    }

    /**
     * Valida ignorando as propriedades informadas — para regras que dependem de contexto.
     * Ex.: na ATUALIZAÇÃO de um parceiro legado sem CPF/CNPJ, o documento não pode travar a edição
     * dos demais campos (o service trata o documento em separado).
     */
    public <T> void validar(T dto, Set<String> propriedadesIgnoradas) {
        if (dto == null) {
            throw new IllegalArgumentException("Dados não informados.");
        }
        Set<ConstraintViolation<T>> violacoes = validator.validate(dto);
        String msg = violacoes.stream()
                .filter(v -> !propriedadesIgnoradas.contains(v.getPropertyPath().toString()))
                .map(ConstraintViolation::getMessage)
                .distinct()
                .collect(Collectors.joining(", "));
        if (!msg.isEmpty()) {
            throw new IllegalArgumentException(msg);
        }
    }
}
