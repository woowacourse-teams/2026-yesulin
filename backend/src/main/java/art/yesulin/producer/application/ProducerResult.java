package art.yesulin.producer.application;

import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.producer.domain.Producer;

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
