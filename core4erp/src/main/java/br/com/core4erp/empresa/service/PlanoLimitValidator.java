package br.com.core4erp.empresa.service;

import br.com.core4erp.empresa.entity.Empresa;
import br.com.core4erp.empresa.repository.EmpresaRepository;
import br.com.core4erp.empresa.repository.UsuarioEmpresaRepository;
import br.com.core4erp.exception.BusinessException;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class PlanoLimitValidator {

    private final EmpresaRepository empresaRepository;
    private final UsuarioEmpresaRepository usuarioEmpresaRepository;

    public void validar(Long empresaId) {
        Empresa empresa = empresaRepository.findByIdComPlano(empresaId)
            .orElseThrow(() -> new EntityNotFoundException("Empresa não encontrada"));
        if (empresa.getPlano() == null) return;
        int max = empresa.getPlano().getMaxUsuarios();
        if (max == -1) return;
        long atual = usuarioEmpresaRepository.countByEmpresaIdAndAtivoTrue(empresaId);
        if (atual >= max) {
            throw new BusinessException("LIMITE_PLANO",
                "Limite de usuários (" + max + ") atingido. Faça upgrade do plano.");
        }
    }
}
