package br.com.core4erp.categoria.service;

import br.com.core4erp.categoria.dto.CategoriaArvoreResponseDto;
import br.com.core4erp.categoria.dto.CategoriaRequestDto;
import br.com.core4erp.categoria.dto.CategoriaResponseDto;
import br.com.core4erp.categoria.dto.SugerirCategoriaRequestDto;
import br.com.core4erp.categoria.dto.SugestaoCategoriaResponseDto;
import br.com.core4erp.categoria.entity.Categoria;
import br.com.core4erp.categoria.repository.CategoriaRepository;
import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.exception.BusinessException;
import br.com.core4erp.utils.DtoValidator;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class CategoriaService {

    private final CategoriaRepository categoriaRepository;
    private final SecurityContextUtils securityCtx;
    private final TenantContext tenantCtx;
    private final DtoValidator dtoValidator;
    private final ClassificacaoIaService classificacaoIaService;

    public CategoriaService(CategoriaRepository categoriaRepository,
                            SecurityContextUtils securityCtx,
                            TenantContext tenantCtx,
                            DtoValidator dtoValidator,
                            ClassificacaoIaService classificacaoIaService) {
        this.categoriaRepository = categoriaRepository;
        this.securityCtx = securityCtx;
        this.tenantCtx = tenantCtx;
        this.dtoValidator = dtoValidator;
        this.classificacaoIaService = classificacaoIaService;
    }

    /**
     * Sugere uma categoria para um lançamento via IA (botão "Sugerir" nos formulários). Não é
     * transacional de propósito: não deve segurar conexão de banco durante a chamada ao modelo.
     * A gravação continua sendo decisão do usuário (o formulário só preenche a sugestão).
     */
    @Requer("CATEGORIA_VISUALIZAR")
    public SugestaoCategoriaResponseDto sugerir(SugerirCategoriaRequestDto dto) {
        dtoValidator.validar(dto);
        return classificacaoIaService.sugerir(dto.descricao(), dto.parceiroNome())
                .map(s -> {
                    String desc = categoriaRepository.findByIdAndEmpresaId(s.categoriaId(), tenantCtx.getEmpresaId())
                            .map(Categoria::getDescricao).orElse(null);
                    return new SugestaoCategoriaResponseDto(s.categoriaId(), desc, s.justificativa(), s.confianca(), true);
                })
                .orElseGet(SugestaoCategoriaResponseDto::vazia);
    }

    @Requer("CATEGORIA_VISUALIZAR")
    @Transactional(readOnly = true)
    public Page<CategoriaResponseDto> listar(Pageable pageable) {
        return categoriaRepository.findAllByEmpresaId(tenantCtx.getEmpresaId(), pageable)
                .map(CategoriaResponseDto::from);
    }

    /** Categorias em árvore (raízes com subcategorias aninhadas). Ordenadas por descrição. */
    @Requer("CATEGORIA_VISUALIZAR")
    @Transactional(readOnly = true)
    public List<CategoriaArvoreResponseDto> listarArvore() {
        // Uma única query traz tudo; a árvore é montada em memória (sem N+1).
        List<Categoria> todas = categoriaRepository.findAllByEmpresaId(tenantCtx.getEmpresaId());

        List<Categoria> raizes = todas.stream()
                .filter(c -> c.getCategoriaPai() == null)
                .sorted(Comparator.comparing(Categoria::getDescricao, String.CASE_INSENSITIVE_ORDER))
                .toList();

        return raizes.stream().map(raiz -> {
            List<CategoriaArvoreResponseDto> filhas = todas.stream()
                    .filter(c -> c.getCategoriaPai() != null && c.getCategoriaPai().getId().equals(raiz.getId()))
                    .sorted(Comparator.comparing(Categoria::getDescricao, String.CASE_INSENSITIVE_ORDER))
                    .map(f -> new CategoriaArvoreResponseDto(
                            f.getId(), f.getDescricao(), f.getIcone(), Boolean.TRUE.equals(f.getAtivo()), List.of()))
                    .toList();
            return new CategoriaArvoreResponseDto(
                    raiz.getId(), raiz.getDescricao(), raiz.getIcone(),
                    Boolean.TRUE.equals(raiz.getAtivo()), filhas);
        }).toList();
    }

    @Requer("CATEGORIA_VISUALIZAR")
    @Transactional(readOnly = true)
    public CategoriaResponseDto buscarPorId(Long id) {
        return CategoriaResponseDto.from(findOwned(id));
    }

    @Requer("CATEGORIA_CRIAR")
    @Transactional
    public CategoriaResponseDto criar(CategoriaRequestDto dto) {
        dtoValidator.validar(dto);
        Long empresaId = tenantCtx.getEmpresaId();

        Categoria pai = resolverPai(dto.categoriaPaiId(), empresaId);
        validarNomeUnico(empresaId, dto.descricao(), dto.categoriaPaiId(), -1L);

        Categoria categoria = new Categoria();
        categoria.setDescricao(dto.descricao());
        categoria.setIcone(dto.icone());
        categoria.setCategoriaPai(pai);
        categoria.setAtivo(true);
        categoria.setUsuario(securityCtx.getUsuario());
        return CategoriaResponseDto.from(categoriaRepository.save(categoria));
    }

    @Requer("CATEGORIA_EDITAR")
    @Transactional
    public CategoriaResponseDto atualizar(Long id, CategoriaRequestDto dto) {
        dtoValidator.validar(dto);
        Long empresaId = tenantCtx.getEmpresaId();
        Categoria categoria = findOwned(id);

        // Mudança de pai: revalida hierarquia e ciclos.
        Long novoPaiId = dto.categoriaPaiId();
        if (novoPaiId != null && novoPaiId.equals(id)) {
            throw new BusinessException("HIERARQUIA_INVALIDA",
                    "Uma categoria não pode ser subcategoria dela mesma.");
        }
        Categoria pai = resolverPai(novoPaiId, empresaId);
        // Se esta categoria já tem filhas, ela não pode virar subcategoria (geraria 3 níveis).
        if (pai != null && categoriaRepository.existsByCategoriaPai_IdAndEmpresaId(id, empresaId)) {
            throw new BusinessException("HIERARQUIA_INVALIDA",
                    "Esta categoria já possui subcategorias, então não pode virar uma subcategoria.");
        }
        validarNomeUnico(empresaId, dto.descricao(), novoPaiId, id);

        categoria.setDescricao(dto.descricao());
        categoria.setIcone(dto.icone());
        categoria.setCategoriaPai(pai);
        return CategoriaResponseDto.from(categoriaRepository.save(categoria));
    }

    /**
     * Remoção = soft delete (regra CLAUDE.md §16). Inativa a categoria e, em cascata, suas
     * subcategorias. Se a categoria estiver em uso por lançamentos, permanece no banco inativada
     * (o histórico continua válido); nunca há DELETE físico.
     */
    @Requer("CATEGORIA_DELETAR")
    @Transactional
    public void deletar(Long id) {
        Long empresaId = tenantCtx.getEmpresaId();
        Categoria categoria = findOwned(id);
        categoria.setAtivo(false);
        categoriaRepository.save(categoria);

        // Cascata: inativa as subcategorias diretas junto com a raiz.
        List<Categoria> filhas = categoriaRepository.findByCategoriaPai_IdAndEmpresaId(id, empresaId);
        for (Categoria filha : filhas) {
            filha.setAtivo(false);
        }
        categoriaRepository.saveAll(filhas);
    }

    /** Reativa uma categoria previamente inativada (a subcategoria não reativa o pai automaticamente). */
    @Requer("CATEGORIA_EDITAR")
    @Transactional
    public CategoriaResponseDto reativar(Long id) {
        Categoria categoria = findOwned(id);
        if (categoria.getCategoriaPai() != null && !Boolean.TRUE.equals(categoria.getCategoriaPai().getAtivo())) {
            throw new BusinessException("CATEGORIA_PAI_INATIVA",
                    "Reative primeiro a categoria principal para poder reativar esta subcategoria.");
        }
        categoria.setAtivo(true);
        return CategoriaResponseDto.from(categoriaRepository.save(categoria));
    }

    // ---- helpers ----

    /** Resolve e valida a categoria-pai: deve existir na empresa e ser uma raiz (não subcategoria). */
    private Categoria resolverPai(Long categoriaPaiId, Long empresaId) {
        if (categoriaPaiId == null) return null;
        Categoria pai = categoriaRepository.findByIdAndEmpresaId(categoriaPaiId, empresaId)
                .orElseThrow(() -> new BusinessException("CATEGORIA_PAI_NAO_ENCONTRADA",
                        "A categoria principal informada não foi encontrada."));
        if (pai.getCategoriaPai() != null) {
            throw new BusinessException("HIERARQUIA_INVALIDA",
                    "Não é possível criar uma subcategoria dentro de outra subcategoria.");
        }
        return pai;
    }

    /** Bloqueia nome repetido no mesmo nível (mesma pai, ou ambas raízes). {@code idAtual}=-1 ao criar. */
    private void validarNomeUnico(Long empresaId, String descricao, Long categoriaPaiId, Long idAtual) {
        boolean duplicada = (categoriaPaiId == null)
                ? categoriaRepository.existsByEmpresaIdAndDescricaoIgnoreCaseAndCategoriaPaiIsNullAndIdNot(
                        empresaId, descricao, idAtual)
                : categoriaRepository.existsByEmpresaIdAndDescricaoIgnoreCaseAndCategoriaPai_IdAndIdNot(
                        empresaId, descricao, categoriaPaiId, idAtual);
        if (duplicada) {
            throw new BusinessException("CATEGORIA_DUPLICADA",
                    "Já existe uma categoria com esse nome neste mesmo grupo.");
        }
    }

    private Categoria findOwned(Long id) {
        return categoriaRepository.findByIdAndEmpresaId(id, tenantCtx.getEmpresaId())
                .orElseThrow(() -> new EntityNotFoundException("Categoria não encontrada: " + id));
    }
}
