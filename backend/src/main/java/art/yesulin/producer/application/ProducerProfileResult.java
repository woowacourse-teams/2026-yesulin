package art.yesulin.producer.application;

import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.producer.domain.Producer;

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
