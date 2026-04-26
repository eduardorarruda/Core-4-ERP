package br.com.core4erp.conciliacao.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class OfxParserService {

    public OfxDadosDto parse(MultipartFile arquivo) throws IOException {
        String conteudo = new String(arquivo.getBytes(), StandardCharsets.UTF_8)
                .replace("\r\n", "\n").replace("\r", "\n");

        OfxDadosDto dados = new OfxDadosDto();

        dados.setBancoId(extrairValor(conteudo, "BANKID"));
        dados.setAgencia(extrairValor(conteudo, "BRANCHID"));
        dados.setNumeroConta(extrairValor(conteudo, "ACCTID"));
        dados.setDataInicio(parseOfxDate(extrairValor(conteudo, "DTSTART")));
        dados.setDataFim(parseOfxDate(extrairValor(conteudo, "DTEND")));

        List<OfxTransacaoDto> transacoes = new ArrayList<>();
        Pattern pattern = Pattern.compile("<STMTTRN>(.*?)</STMTTRN>", Pattern.DOTALL | Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(conteudo);

        while (matcher.find()) {
            String bloco = matcher.group(1);
            String valorStr = extrairValor(bloco, "TRNAMT");
            if (valorStr.isBlank()) continue;

            OfxTransacaoDto t = new OfxTransacaoDto();
            t.setOfxId(extrairValor(bloco, "FITID"));
            t.setTipo(extrairValor(bloco, "TRNTYPE"));
            t.setValor(new BigDecimal(valorStr.replace(",", ".")));
            t.setData(parseOfxDate(extrairValor(bloco, "DTPOSTED")));
            t.setMemo(extrairValor(bloco, "MEMO"));
            t.setNome(extrairValor(bloco, "NAME"));
            transacoes.add(t);
        }

        dados.setTransacoes(transacoes);
        return dados;
    }

    private String extrairValor(String texto, String tag) {
        Pattern p = Pattern.compile("<" + tag + ">([^\n<]+)", Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(texto);
        return m.find() ? m.group(1).trim() : "";
    }

    private LocalDate parseOfxDate(String ofxDate) {
        if (ofxDate == null || ofxDate.length() < 8) return null;
        return LocalDate.parse(ofxDate.substring(0, 8), DateTimeFormatter.ofPattern("yyyyMMdd"));
    }
}
