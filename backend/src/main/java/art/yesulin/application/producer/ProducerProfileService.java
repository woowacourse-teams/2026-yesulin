package art.yesulin.application.producer;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.member.Member;
import art.yesulin.domain.member.MemberRepository;
import art.yesulin.domain.producer.Producer;
import art.yesulin.domain.producer.ProducerErrorCode;
import art.yesulin.domain.producer.ProducerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProducerProfileService {

    private final MemberRepository memberRepository;
    private final ProducerRepository producerRepository;

    @Transactional(readOnly = true)
    public ProducerProfileResult find(long memberId) {
        return ProducerProfileResult.of(findMember(memberId), findProducer(memberId));
    }

    @Transactional
    public ProducerProfileResult update(long memberId, UpdateProducerProfileCommand command) {
        UpdateProducerProfileCommand validCommand = requireNonNull(command, "수정할 정보는 필수입니다.");
        if (validCommand.isEmpty()) {
            throw new BusinessException(ProducerErrorCode.INVALID_UPDATE, "변경할 기획사·제작사 정보가 없습니다.");
        }

        Producer producer = findProducer(memberId);
        if (validCommand.companyName() != null) {
            producer.updateCompanyName(validCommand.companyName());
        }
        if (validCommand.contactName() != null) {
            producer.updateContactName(validCommand.contactName());
        }
        if (validCommand.contactRole() != null) {
            producer.updateContactRole(validCommand.contactRole());
        }
        if (validCommand.description() != null) {
            producer.updateDescription(validCommand.description());
        }
        return ProducerProfileResult.of(findMember(memberId), producer);
    }

    private Producer findProducer(long memberId) {
        long validMemberId = requirePositive(memberId, "회원 ID는 1 이상이어야 합니다.");
        return producerRepository.findByMemberId(validMemberId)
                .orElseThrow(() -> new BusinessException(
                        ProducerErrorCode.PRODUCER_NOT_FOUND, "기획사·제작사 정보를 찾을 수 없습니다."));
    }

    private Member findMember(long memberId) {
        return memberRepository.findById(memberId)
                .orElseThrow(() -> new BusinessException(
                        ProducerErrorCode.PRODUCER_NOT_FOUND, "기획사·제작사 정보를 찾을 수 없습니다."));
    }
}
