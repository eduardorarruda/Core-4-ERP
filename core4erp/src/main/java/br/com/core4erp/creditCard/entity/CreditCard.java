package br.com.core4erp.creditCard.entity;

import br.com.core4erp.checkingAccount.entity.CheckingAccount;
import br.com.core4erp.config.auditing.Auditable;
import br.com.core4erp.user.entity.User;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.envers.Audited;

import java.math.BigDecimal;

@Entity
@Data
@Audited
@Table(name = "tb_credit_card")
public class CreditCard extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 100)
    private String creditCardName;
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal limitAmount;
    @Column(nullable = false)
    private Integer closingDay;
    @Column(nullable = false)
    private Integer dueDay;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "checking_account_id", nullable = false)
    private CheckingAccount checkingAccount;

}
