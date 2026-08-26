package art.yesulin.application.admin;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.admin.AdminAction;
import art.yesulin.domain.admin.AdminAuditLog;
import art.yesulin.domain.admin.AdminAuditLogRepository;
import art.yesulin.domain.member.Member;
import art.yesulin.domain.member.MemberErrorCode;
import art.yesulin.domain.member.MemberRepository;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 운영자가 회원 상태를 바꾸는 use case다. 대상은 기획사·제작사 계정으로 제한하고 결과를 감사 로그에 남긴다.
 */
@Service
@RequiredArgsConstructor
public class AdminMemberService {

    private static final String TARGET_TYPE = "MEMBER";

    private final MemberRepository memberRepository;
    private final AdminAuditLogRepository adminAuditLogRepository;

    @Transactional
    public MemberStatusResult changeStatus(ChangeMemberStatusCommand command) {
        Member member = memberRepository.findById(command.targetMemberId())
                .orElseThrow(() -> new BusinessException(MemberErrorCode.MEMBER_NOT_FOUND, "회원을 찾을 수 없습니다."));

        if (member.getType() != MemberType.PRODUCER) {
            throw new BusinessException(
                    MemberErrorCode.STATUS_CHANGE_NOT_ALLOWED, "기획사·제작사 계정만 상태를 바꿀 수 있습니다.");
        }

        MemberStatus before = member.getStatus();
        member.changeStatus(command.status());
        adminAuditLogRepository.save(new AdminAuditLog(
                command.actorMemberId(),
                AdminAction.MEMBER_STATUS_CHANGED,
                TARGET_TYPE,
                member.getId(),
                "%s -> %s".formatted(before, member.getStatus())
        ));

        return MemberStatusResult.from(member);
    }
}
