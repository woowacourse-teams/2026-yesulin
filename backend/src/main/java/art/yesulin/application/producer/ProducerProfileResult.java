package art.yesulin.application.producer;

import art.yesulin.domain.member.Member;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.producer.Producer;

public record ProducerProfileResult(
        String companyName,
        String contactName,
        String contactRole,
        String description,
        String email,
        String phone,
        MemberStatus verificationStatus
) {

    public static ProducerProfileResult of(Member member, Producer producer) {
        return new ProducerProfileResult(
                producer.getCompanyName(),
                producer.getContactName(),
                producer.getContactRole(),
                producer.getDescription(),
                member.getEmail(),
                producer.getPhone(),
                member.getStatus()
        );
    }
}
