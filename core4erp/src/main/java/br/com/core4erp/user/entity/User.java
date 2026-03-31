package br.com.core4erp.user.entity;


import br.com.core4erp.config.auditing.Auditable;
import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "tb_user")
public class User extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String name;
    @Column(nullable = false, unique = true)
    private String email;
    private Long phoneNumber;

}
