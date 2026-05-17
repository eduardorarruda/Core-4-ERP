package br.com.core4erp.conciliacaoCartao.service;

import br.com.core4erp.cartaoCredito.entity.LancamentoCartao;
import br.com.core4erp.conciliacao.service.OfxTransacaoDto;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.Set;

@Service
public class ConciliacaoCartaoScoreService {

    public int calcular(OfxTransacaoDto ofxTrn, LancamentoCartao lancamento) {
        int score = 0;
        BigDecimal valorOfx = ofxTrn.getValor().abs();
        BigDecimal valorLanc = lancamento.getValor().abs();

        if (valorOfx.compareTo(valorLanc) == 0) {
            score += 50;
        } else if (valorOfx.subtract(valorLanc).abs().compareTo(new BigDecimal("10")) <= 0) {
            score += 30;
        }

        if (ofxTrn.getData() != null && lancamento.getDataCompra() != null) {
            long dias = Math.abs(ChronoUnit.DAYS.between(ofxTrn.getData(), lancamento.getDataCompra()));
            if (dias == 0) score += 20;
            else if (dias <= 3) score += 10;
        }

        if (ofxTrn.getMemo() != null && lancamento.getDescricao() != null) {
            double sim = calcularJaccard(normalizar(ofxTrn.getMemo()), normalizar(lancamento.getDescricao()));
            if (sim >= 0.6) score += 20;
            else if (sim >= 0.3) score += 10;
        }

        if (lancamento.getParceiro() != null && ofxTrn.getMemo() != null) {
            String nomeParc = lancamento.getParceiro().getNomeFantasia() != null
                    ? lancamento.getParceiro().getNomeFantasia()
                    : lancamento.getParceiro().getRazaoSocial();
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
