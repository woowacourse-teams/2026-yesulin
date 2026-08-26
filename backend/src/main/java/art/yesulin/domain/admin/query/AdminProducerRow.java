package art.yesulin.domain.admin.query;

import art.yesulin.domain.member.MemberStatus;
import java.time.Instant;

/**
 * 승인 판단에 필요한 기획사·제작사 정보다. 지원서 원문과 배우 개인정보는 포함하지 않는다.
 */
public record AdminProducerRow(
        long memberId,
        String email,
        MemberStatus status,
        Instant joinedAt,
        String companyName,
        String contactName,
        String contactRole,
        String phone,
        long performanceCount,
        long auditionCount
) {
}
