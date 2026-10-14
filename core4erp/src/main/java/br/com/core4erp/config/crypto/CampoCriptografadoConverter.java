package br.com.core4erp.config.crypto;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Converter JPA que cifra o atributo ao gravar e decifra ao ler (AES-256-GCM, ver
 * {@link CriptografiaCampos}). Uso: {@code @Convert(converter = CampoCriptografadoConverter.class)}.
 *
 * <p>Atenção: campos cifrados NÃO podem ser usados em WHERE/LIKE/ORDER BY (o valor no banco é
 * aleatório a cada gravação) — use a coluna de índice cego ({@code *_hash}) para busca exata.
 */
@Converter
public class CampoCriptografadoConverter implements AttributeConverter<String, String> {

    @Override
    public String convertToDatabaseColumn(String atributo) {
        return atributo == null ? null : CriptografiaCamposHolder.get().cifrar(atributo);
    }

    @Override
    public String convertToEntityAttribute(String colunaBanco) {
        return colunaBanco == null ? null : CriptografiaCamposHolder.get().decifrar(colunaBanco);
    }
}
