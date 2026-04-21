package br.com.core4erp.parceiro.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Optional;

@Service
public class BrasilApiService {

    private static final Logger log = LoggerFactory.getLogger(BrasilApiService.class);
    private static final String BASE_URL = "https://brasilapi.com.br/api/cnpj/v1/";

    private final WebClient webClient;

    public BrasilApiService(WebClient.Builder builder) {
        this.webClient = builder.baseUrl(BASE_URL).build();
    }

    public Optional<CnpjData> buscarCnpj(String cnpj) {
        String digits = cnpj.replaceAll("[^\\d]", "");
        if (digits.length() != 14) return Optional.empty();
        try {
            CnpjData data = webClient.get()
                    .uri(digits)
                    .retrieve()
                    .bodyToMono(CnpjData.class)
                    .timeout(Duration.ofSeconds(8))
                    .block();
            return Optional.ofNullable(data);
        } catch (Exception e) {
            log.warn("BrasilAPI indisponível para CNPJ {}: {}", digits, e.getMessage());
            return Optional.empty();
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CnpjData(
            @JsonProperty("razao_social") String razaoSocial,
            @JsonProperty("nome_fantasia") String nomeFantasia,
            @JsonProperty("logradouro") String logradouro,
            @JsonProperty("numero") String numero,
            @JsonProperty("complemento") String complemento,
            @JsonProperty("bairro") String bairro,
            @JsonProperty("municipio") String municipio,
            @JsonProperty("uf") String uf,
            @JsonProperty("cep") String cep,
            @JsonProperty("ddd_telefone_1") String dddTelefone1,
            @JsonProperty("email") String email
    ) {
        public String telefoneFormatado() {
            if (dddTelefone1 == null || dddTelefone1.isBlank()) return null;
            String digits = dddTelefone1.replaceAll("[^\\d]", "");
            if (digits.length() == 10) return "(" + digits.substring(0, 2) + ") " + digits.substring(2, 6) + "-" + digits.substring(6);
            if (digits.length() == 11) return "(" + digits.substring(0, 2) + ") " + digits.substring(2, 7) + "-" + digits.substring(7);
            return dddTelefone1;
        }
    }
}
