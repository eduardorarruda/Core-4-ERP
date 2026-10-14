package br.com.core4erp.auth.service;

import br.com.core4erp.auth.dto.DadosPessoaisResponseDto;
import br.com.core4erp.config.security.SessaoUsuarioService;
import br.com.core4erp.config.tenant.PermissaoCacheService;
import br.com.core4erp.empresa.entity.Empresa;
import br.com.core4erp.empresa.entity.PerfilAcesso;
import br.com.core4erp.empresa.entity.UsuarioEmpresa;
import br.com.core4erp.empresa.repository.UsuarioEmpresaRepository;
import br.com.core4erp.exception.BusinessException;
import br.com.core4erp.usuario.entity.Usuario;
import br.com.core4erp.usuario.repository.UsuarioRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ContaUsuarioServiceTest {

    private final UsuarioRepository usuarioRepo = mock(UsuarioRepository.class);
    private final UsuarioEmpresaRepository ueRepo = mock(UsuarioEmpresaRepository.class);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private final PermissaoCacheService cache = mock(PermissaoCacheService.class);
    private final ContaUsuarioService service = new ContaUsuarioService(usuarioRepo, ueRepo, encoder,
            new SessaoUsuarioService(usuarioRepo), cache);

    private Usuario usuario;
    private Empresa empresa;
    private UsuarioEmpresa vinculo;

    @BeforeEach
    void dados() {
        usuario = new Usuario();
        usuario.setId(7L);
        usuario.setNome("Fulano");
        usuario.setEmail("fulano@x.com");
        usuario.setTelefone("11999999999");
        usuario.setFotoPerfil("data:image/png;base64,AAAA");
        usuario.setSenhaHash(encoder.encode("Senha123"));
        when(usuarioRepo.findByEmail("fulano@x.com")).thenReturn(Optional.of(usuario));

        empresa = new Empresa();
        empresa.setId(10L);
        empresa.setNome("Fulano");
        empresa.setEmailContato("fulano@x.com");
        PerfilAcesso prop = new PerfilAcesso();
        prop.setNome("PROPRIETARIO");
        vinculo = new UsuarioEmpresa();
        vinculo.setUsuario(usuario);
        vinculo.setEmpresa(empresa);
        vinculo.setPerfil(prop);
        when(ueRepo.findByUsuarioId(7L)).thenReturn(List.of(vinculo));
    }

    @Test
    void exportar_trazDadosDoTitularSemHashDeSenha() throws Exception {
        DadosPessoaisResponseDto dados = service.exportarDados("fulano@x.com");

        String json = new ObjectMapper().registerModule(new JavaTimeModule()).writeValueAsString(dados);
        assertThat(dados.titular().email()).isEqualTo("fulano@x.com");
        assertThat(dados.titular().possuiFotoPerfil()).isTrue();
        assertThat(dados.empresas()).hasSize(1);
        assertThat(json).doesNotContain(usuario.getSenhaHash()).doesNotContainIgnoringCase("senha");
    }

    @Test
    void excluir_senhaErrada_recusa() {
        assertThatThrownBy(() -> service.excluirConta("fulano@x.com", "errada"))
                .isInstanceOf(BusinessException.class);
        verify(usuarioRepo, never()).save(any());
    }

    @Test
    void excluir_proprietarioComOutrosMembros_409() {
        when(ueRepo.countByEmpresaIdAndAtivoTrueAndUsuarioIdNot(10L, 7L)).thenReturn(2L);
        assertThatThrownBy(() -> service.excluirConta("fulano@x.com", "Senha123"))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getCode()).isEqualTo("REGISTRO_EM_USO");
        assertThat(usuario.getEmail()).isEqualTo("fulano@x.com");
    }

    @Test
    void excluir_anonimizaDesativaVinculosERevogaTokens() {
        service.excluirConta("fulano@x.com", "Senha123");

        assertThat(usuario.getNome()).isEqualTo("Usuário removido");
        assertThat(usuario.getEmail()).isEqualTo("removido-7@anonimo.invalid");
        assertThat(usuario.getTelefone()).isNull();
        assertThat(usuario.getFotoPerfil()).isNull();
        assertThat(encoder.matches("Senha123", usuario.getSenhaHash())).isFalse();
        assertThat(usuario.getTokenVersion()).isEqualTo(1);
        assertThat(vinculo.getAtivo()).isFalse();
        assertThat(empresa.getAtiva()).isFalse();
        assertThat(empresa.getEmailContato()).isNull();
        verify(cache).invalidar("fulano@x.com", 10L);
        verify(usuarioRepo).save(usuario);
    }
}
