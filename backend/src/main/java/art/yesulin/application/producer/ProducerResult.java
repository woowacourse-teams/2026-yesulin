package art.yesulin.application.producer;

import art.yesulin.domain.member.Member;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.domain.producer.Producer;

public record ProducerResult(
        long memberId,
        String companyName,
        String email,
        MemberType role,
        MemberStatus verificationStatus
) {

    public static ProducerResult of(Member member, Producer producer) {
        return new ProducerResult(
                member.getId(),
                producer.getCompanyName(),
                member.getEmail(),
                member.getType(),
                member.getStatus()
        );
    }
}
