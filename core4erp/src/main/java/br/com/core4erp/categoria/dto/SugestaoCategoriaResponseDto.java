package br.com.core4erp.categoria.dto;

/**
 * Sugestão de categoria devolvida ao formulário. {@code encontrou=false} quando a IA não
 * conseguiu sugerir com confiança suficiente — o formulário mantém a escolha manual.
 */
public record SugestaoCategoriaResponseDto(
        Long categoriaId,
        String categoriaDescricao,
        String justificativa,
        double confianca,
        boolean encontrou
) {
    public static SugestaoCategoriaResponseDto vazia() {
        return new SugestaoCategoriaResponseDto(null, null, null, 0.0, false);
    }
}
