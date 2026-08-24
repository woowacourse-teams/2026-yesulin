package art.yesulin.application.auth.social;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.domain.member.Member;
import art.yesulin.domain.member.MemberRepository;
import art.yesulin.domain.social.SocialAccount;
import art.yesulin.domain.social.SocialAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SocialLoginService {

    private final MemberRepository memberRepository;
    private final SocialAccountRepository socialAccountRepository;

    /**
     * (issuer, subject)로 연결된 회원을 찾고, 없으면 배우 계정과 소셜 연결을 함께 만든다.
     */
    @Transactional
    public MemberPrincipal login(SocialIdentity identity) {
        String issuer = identity.issuer().toString();
        return socialAccountRepository.findByIssuerAndSubject(issuer, identity.subject())
                .map(account -> memberRepository.findById(account.getMemberId())
                        .orElseThrow(() -> new IllegalStateException("소셜 계정에 연결된 회원이 없습니다.")))
                .map(MemberPrincipal::from)
                .orElseGet(() -> MemberPrincipal.from(createApplicant(identity, issuer)));
    }

    private Member createApplicant(SocialIdentity identity, String issuer) {
        Member member = memberRepository.save(Member.ofApplicant());
        socialAccountRepository.save(
                new SocialAccount(member.getId(), identity.provider(), issuer, identity.subject()));
        return member;
    }
}
