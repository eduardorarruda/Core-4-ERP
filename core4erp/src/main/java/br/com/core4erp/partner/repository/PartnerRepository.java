package br.com.core4erp.partner.repository;

import br.com.core4erp.partner.entity.Partner;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PartnerRepository extends JpaRepository<Partner, Long> {
}
