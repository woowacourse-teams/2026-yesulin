package art.yesulin.presentation.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import art.yesulin.application.auth.MemberPrincipal;
import art.yesulin.application.auth.social.SocialIdentity;
import art.yesulin.application.auth.social.SocialProvider;
import art.yesulin.domain.member.MemberRepository;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.domain.social.SocialAccountRepository;
import art.yesulin.support.ObjectStorageTestConfiguration;
import jakarta.servlet.http.HttpSession;
import java.net.URI;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:social-handler;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
class MemberSocialLoginHandlerTest {

    private static final SocialIdentity IDENTITY = new SocialIdentity(
            SocialProvider.KAKAO, URI.create("https://kauth.kakao.com"), "1234567890");

    @Autowired
    private MemberSocialLoginHandler handler;

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
    void putsActiveApplicantPrincipalIntoSession() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onSuccess(IDENTITY, request, response);

        HttpSession session = request.getSession(false);
        assertNotNull(session);
        MemberPrincipal principal =
                (MemberPrincipal) session.getAttribute(MemberPrincipal.SESSION_ATTRIBUTE);
        assertNotNull(principal);
        assertEquals(MemberType.APPLICANT, principal.role());
        assertEquals(MemberStatus.ACTIVE, principal.status());
    }

    @Test
    void redirectsAfterSuccess() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onSuccess(IDENTITY, request, response);

        assertNotNull(response.getRedirectedUrl());
    }

    @Test
    void reusesMemberWhenSameIdentityLogsInAgain() throws Exception {
        MockHttpServletRequest first = new MockHttpServletRequest();
        handler.onSuccess(IDENTITY, first, new MockHttpServletResponse());
        MemberPrincipal firstPrincipal = (MemberPrincipal) first.getSession(false)
                .getAttribute(MemberPrincipal.SESSION_ATTRIBUTE);

        MockHttpServletRequest second = new MockHttpServletRequest();
        handler.onSuccess(IDENTITY, second, new MockHttpServletResponse());
        MemberPrincipal secondPrincipal = (MemberPrincipal) second.getSession(false)
                .getAttribute(MemberPrincipal.SESSION_ATTRIBUTE);

        assertEquals(firstPrincipal.memberId(), secondPrincipal.memberId());
        assertEquals(1, memberRepository.count());
    }
}
