package br.com.core4erp.conciliacao.service;

import br.com.core4erp.conta.entity.Conta;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.Set;

@Service
public class ConciliacaoScoreService {

    public int calcular(OfxTransacaoDto ofxTrn, Conta conta) {
        int score = 0;
        BigDecimal valorOfx = ofxTrn.getValor().abs();
        BigDecimal valorConta = conta.getValorOriginal().abs();

        if (valorOfx.compareTo(valorConta) == 0) {
            score += 40;
        } else if (valorOfx.subtract(valorConta).abs().compareTo(new BigDecimal("0.05")) <= 0) {
            score += 20;
        }

        if (ofxTrn.getData() != null && conta.getDataVencimento() != null) {
            long dias = Math.abs(ChronoUnit.DAYS.between(ofxTrn.getData(), conta.getDataVencimento()));
            if (dias == 0) score += 30;
            else if (dias <= 3) score += 15;
        }

        if (ofxTrn.getMemo() != null && conta.getDescricao() != null) {
            double sim = calcularJaccard(normalizar(ofxTrn.getMemo()), normalizar(conta.getDescricao()));
            if (sim >= 0.6) score += 20;
            else if (sim >= 0.3) score += 10;
        }

        if (conta.getParceiro() != null && ofxTrn.getMemo() != null) {
            String nomeParc = conta.getParceiro().getNomeFantasia() != null
                    ? conta.getParceiro().getNomeFantasia()
                    : conta.getParceiro().getRazaoSocial();
            if (nomeParc != null && !nomeParc.isBlank()) {
                String prefixo = normalizar(nomeParc);
                prefixo = prefixo.substring(0, Math.min(5, prefixo.length()));
                if (!prefixo.isBlank() && normalizar(ofxTrn.getMemo()).contains(prefixo)) {
                    score += 10;
                }
            }
        }

        return score;
    }

    private double calcularJaccard(String a, String b) {
        Set<String> bg_a = bigramas(a);
        Set<String> bg_b = bigramas(b);
        if (bg_a.isEmpty() || bg_b.isEmpty()) return 0;
        Set<String> intersecao = new HashSet<>(bg_a);
        intersecao.retainAll(bg_b);
        Set<String> uniao = new HashSet<>(bg_a);
        uniao.addAll(bg_b);
        return (double) intersecao.size() / uniao.size();
    }

    private Set<String> bigramas(String s) {
        Set<String> bg = new HashSet<>();
        for (int i = 0; i < s.length() - 1; i++) bg.add(s.substring(i, i + 2));
        return bg;
    }

    private String normalizar(String s) {
        return Normalizer.normalize(s, Normalizer.Form.NFD)
                .replaceAll("[^\\p{ASCII}]", "")
                .toLowerCase()
                .replaceAll("[^a-z0-9]", " ")
                .trim();
    }
}
