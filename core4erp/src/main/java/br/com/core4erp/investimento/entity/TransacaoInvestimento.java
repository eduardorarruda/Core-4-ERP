package br.com.core4erp.investimento.entity;

import br.com.core4erp.config.auditing.Auditable;
import br.com.core4erp.contaCorrente.entity.ContaCorrente;
import br.com.core4erp.enums.TipoTransacaoInvestimento;
import br.com.core4erp.usuario.entity.Usuario;
import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@EqualsAndHashCode(of = "id", callSuper = false)
@Getter
@Setter
@Entity
@Table(name = "tb_transacao_investimento")
public class TransacaoInvestimento extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conta_investimento_id", nullable = false)
    private ContaInvestimento contaInvestimento;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 15)
    private TipoTransacaoInvestimento tipoTransacao;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal valor;

    @Column(nullable = false)
    private LocalDate dataTransacao;

    /** Conta corrente debitada em aportes (opcional). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conta_corrente_origem_id")
    private ContaCorrente contaCorrenteOrigem;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;
}
