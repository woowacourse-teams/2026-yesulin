package art.yesulin.application.auth.social;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.domain.member.Member;
import art.yesulin.domain.member.MemberRepository;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.domain.social.SocialAccountRepository;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.net.URI;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:social-login;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
class SocialLoginServiceTest {

    private static final SocialIdentity IDENTITY = new SocialIdentity(
            SocialProvider.KAKAO, URI.create("https://kauth.kakao.com"), "1234567890");

    @Autowired
    private SocialLoginService socialLoginService;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private SocialAccountRepository socialAccountRepository;

    @BeforeEach
    void cleanUp() {
        socialAccountRepository.deleteAll();
        memberRepository.deleteAll();
    }

    @Test
    void createsActiveApplicantOnFirstLogin() {
        MemberPrincipal principal = socialLoginService.login(IDENTITY);

        assertEquals(MemberType.APPLICANT, principal.role());
        assertEquals(MemberStatus.ACTIVE, principal.status());
        assertEquals(1, memberRepository.count());
        assertEquals(1, socialAccountRepository.count());
    }

    @Test
    void reusesMemberOnSecondLogin() {
        MemberPrincipal first = socialLoginService.login(IDENTITY);
        MemberPrincipal second = socialLoginService.login(IDENTITY);

        assertEquals(first.memberId(), second.memberId());
        assertEquals(1, memberRepository.count());
        assertEquals(1, socialAccountRepository.count());
    }

    @Test
    void separatesMembersByProvider() {
        SocialIdentity naver = new SocialIdentity(
                SocialProvider.NAVER, URI.create("https://nid.naver.com"), "1234567890");

        MemberPrincipal kakaoMember = socialLoginService.login(IDENTITY);
        MemberPrincipal naverMember = socialLoginService.login(naver);

        assertTrue(kakaoMember.memberId() != naverMember.memberId());
        assertEquals(2, memberRepository.count());
    }

    @Test
    void createsApplicantWithoutEmailOrPassword() {
        MemberPrincipal principal = socialLoginService.login(IDENTITY);

        Member member = memberRepository.findById(principal.memberId()).orElseThrow();
        assertNull(member.getEmail());
        assertTrue(!member.hasPassword());
    }
}
