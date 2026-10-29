package art.yesulin.auth.application.memberlink;

import art.yesulin.auth.application.AuthErrorCode;
import art.yesulin.auth.domain.member.Member;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import art.yesulin.auth.domain.memberlink.MemberLinkCode;
import art.yesulin.auth.domain.memberlink.MemberLinkCodeErrorCode;
import art.yesulin.auth.domain.memberlink.MemberLinkCodeRepository;
import art.yesulin.global.exception.BusinessException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MemberLinkCodeService {

    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();
    private final MemberRepository memberRepository;
    private final MemberLinkCodeRepository repository;
    private final Clock clock;

    @Transactional
    public MemberLinkCodeResult issue(long memberId) {
        requireApplicantForUpdate(memberId);
        Instant now = clock.instant();
        MemberLinkCode existing = repository.findById(memberId).orElse(null);
        if (existing != null) {
            existing.ensureReissuable(now);
        }
        for (int attempt = 0; attempt < 10; attempt++) {
            String code = randomCode();
            String hash = MemberLinkCode.hash(code);
            if (repository.existsByCodeHash(hash)) {
                continue;
            }
            MemberLinkCode issued = existing == null ? new MemberLinkCode(memberId, hash, now) : existing;
            if (existing != null) {
                issued.reissue(hash, now);
            }
            try {
                repository.saveAndFlush(issued);
            } catch (DataIntegrityViolationException exception) {
                throw issueRetry();
            }
            return new MemberLinkCodeResult(code.substring(0, 4) + "-" + code.substring(4),
                    issued.getExpiresAt(), now.plus(MemberLinkCode.REISSUE_INTERVAL),
                    MemberLinkCode.VALIDITY.toSeconds(), MemberLinkCode.REISSUE_INTERVAL.toSeconds());
        }
        throw issueRetry();
    }

    /** 연결 저장 실패 시 코드 소비도 롤백되도록 호출자의 트랜잭션에 참여한다. */
    @Transactional(propagation = Propagation.MANDATORY)
    public long consume(String code) {
        String hash = MemberLinkCode.hash(code);
        long memberId = repository.findMemberIdByCodeHash(hash).orElseThrow(MemberLinkCode::invalid);
        requireApplicantForUpdate(memberId);
        MemberLinkCode current = repository.findByIdForUpdate(memberId).orElseThrow(MemberLinkCode::invalid);
        current.consume(hash, clock.instant());
        return memberId;
    }

    private Member requireApplicantForUpdate(long memberId) {
        return memberRepository.findForUpdate(memberId)
                .filter(member -> member.getType() == MemberType.APPLICANT && member.getStatus() == MemberStatus.ACTIVE)
                .orElseThrow(() -> new BusinessException(AuthErrorCode.FORBIDDEN, "활성 배우 계정만 연결할 수 있습니다."));
    }

    private static String randomCode() {
        StringBuilder code = new StringBuilder();
        for (int index = 0; index < 8; index++) {
            code.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return code.toString();
    }

    private static BusinessException issueRetry() {
        return new BusinessException(MemberLinkCodeErrorCode.ISSUE_RETRY, "코드를 발급하지 못했습니다. 다시 시도해 주세요.");
    }
}
