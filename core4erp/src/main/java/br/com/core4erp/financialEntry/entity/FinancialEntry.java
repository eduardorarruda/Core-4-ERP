package br.com.core4erp.financialEntry.entity;

import br.com.core4erp.category.entity.Category;
import br.com.core4erp.checkingAccount.entity.CheckingAccount;
import br.com.core4erp.enums.EntryStatus;
import br.com.core4erp.enums.EntryType;
import br.com.core4erp.partner.entity.Partner;
import br.com.core4erp.user.entity.User;
import jakarta.persistence.*;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Data
@Table(name = "tb_financial_entry")
public class FinancialEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String description;
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;
    @Column(nullable = false)
    private LocalDate dueDate;
    private LocalDate paymentDate;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 7)
    private EntryType type;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EntryStatus status;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    private Category category;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_id")
    private Partner partner;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checking_account_id")
    private CheckingAccount checkingAccount;

}
