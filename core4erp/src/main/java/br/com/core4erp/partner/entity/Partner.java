package br.com.core4erp.partner.entity;

import br.com.core4erp.config.auditing.Auditable;
import br.com.core4erp.enums.PartnerType;
import br.com.core4erp.user.entity.User;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.envers.Audited;

@Entity
@Data
@Table(name = "tb_partner")
public class Partner extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String name;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private PartnerType type;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

}
