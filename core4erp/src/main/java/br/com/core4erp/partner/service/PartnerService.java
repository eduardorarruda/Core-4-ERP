package br.com.core4erp.partner.service;

import br.com.core4erp.enums.PartnerType;
import br.com.core4erp.partner.dto.PartnerRequestDto;
import br.com.core4erp.partner.entity.Partner;
import br.com.core4erp.partner.repository.PartnerRepository;
import br.com.core4erp.user.entity.User;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class PartnerService {

    private final PartnerRepository partnerRepository;

    public PartnerService(PartnerRepository partnerRepository){
        this.partnerRepository = partnerRepository;
    }

    public void createPartner(User user, PartnerRequestDto request){

        Partner partner = new Partner();
        partner.setName(request.getPartnerName());
        partner.setType(request.getPartnerType());
        partner.setUser(user);

        partnerRepository.save(partner);

    }

    public void updatePartner(PartnerRequestDto request){
        Partner partner = getPartnerById(request.getPartnerId());
        partner.setType(request.getPartnerType());
        partner.setName(request.getPartnerName());

        partnerRepository.save(partner);
    }


    public void deletePartner(Long id){
        Partner partner =  getPartnerById(id);
        partnerRepository.delete(partner);
    }

    public Partner getPartnerById(Long id){
        Optional<Partner> partner = partnerRepository.findById(id);
        if(partner.isEmpty())
            throw new RuntimeException("Parceiro nao encontrado");
        return partner.get();
    }

}
