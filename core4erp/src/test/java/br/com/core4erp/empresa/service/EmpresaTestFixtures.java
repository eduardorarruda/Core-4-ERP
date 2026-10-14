package br.com.core4erp.empresa.service;

import br.com.core4erp.empresa.entity.Empresa;
import br.com.core4erp.empresa.entity.PerfilAcesso;
import br.com.core4erp.empresa.entity.Permissao;
import br.com.core4erp.empresa.entity.UsuarioEmpresa;
import br.com.core4erp.usuario.entity.Usuario;

import java.util.Arrays;
import java.util.HashSet;

/** Fábricas de entidades para os testes de RBAC. */
final class EmpresaTestFixtures {

    private EmpresaTestFixtures() {}

    static Permissao permissao(long id, String codigo) {
        Permissao p = new Permissao();
        p.setId(id);
        p.setCodigo(codigo);
        return p;
    }

    static PerfilAcesso perfil(long id, String nome, Long empresaId, Permissao... permissoes) {
        PerfilAcesso p = new PerfilAcesso();
        p.setId(id);
        p.setNome(nome);
        p.setEmpresaId(empresaId);
        p.setPermissoes(new HashSet<>(Arrays.asList(permissoes)));
        return p;
    }

    static UsuarioEmpresa vinculo(long usuarioId, String email, long empresaId, PerfilAcesso perfil) {
        Usuario u = new Usuario();
        u.setId(usuarioId);
        u.setEmail(email);
        u.setNome("Usuário " + usuarioId);
        Empresa e = new Empresa();
        e.setId(empresaId);
        UsuarioEmpresa ue = new UsuarioEmpresa();
        ue.setUsuario(u);
        ue.setEmpresa(e);
        ue.setPerfil(perfil);
        return ue;
    }
}
