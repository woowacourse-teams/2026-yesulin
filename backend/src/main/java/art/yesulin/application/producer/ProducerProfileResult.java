package art.yesulin.application.producer;

import art.yesulin.domain.member.Member;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.producer.Producer;
import java.time.Instant;

public record ProducerProfileResult(
        String companyName,
        String contactName,
        String contactRole,
        String description,
        String email,
        String phone,
        MemberStatus verificationStatus,
        Instant verifiedAt
) {

    /**
     * MVP는 가입 직후 바로 활성화되므로 활성화 시각으로 기획사·제작사 생성 시각을 사용한다.
     */
    public static ProducerProfileResult of(Member member, Producer producer) {
        return new ProducerProfileResult(
                producer.getCompanyName(),
                producer.getContactName(),
                producer.getContactRole(),
                producer.getDescription(),
                member.getEmail(),
                producer.getPhone(),
                member.getStatus(),
                producer.getCreatedAt()
        );
    }
}
