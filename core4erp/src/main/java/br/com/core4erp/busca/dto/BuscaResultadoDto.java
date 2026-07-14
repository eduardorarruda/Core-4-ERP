package br.com.core4erp.busca.dto;

/**
 * Resultado unificado da busca global do cabeçalho.
 *
 * @param tipo      PARCEIRO, CONTA ou LANCAMENTO_CARTAO
 * @param id        id do registro
 * @param titulo    texto principal exibido
 * @param subtitulo texto secundário (contexto)
 * @param rota      rota do frontend para navegação ao selecionar
 */
public record BuscaResultadoDto(String tipo, Long id, String titulo, String subtitulo, String rota) {}
