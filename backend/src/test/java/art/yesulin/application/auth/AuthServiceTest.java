package art.yesulin.application.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.member.Member;
import art.yesulin.domain.member.MemberRepository;
import art.yesulin.domain.member.MemberType;
import art.yesulin.presentation.api.auth.AuthRole;
import art.yesulin.support.ObjectStorageTestConfiguration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:auth;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
class AuthServiceTest {

    private static final String EMAIL = "producer@yesulin.art";
    private static final String PASSWORD = "password1234";

    @Autowired
    private AuthService authService;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        memberRepository.deleteAll();
        memberRepository.save(new Member(EMAIL, passwordEncoder.encode(PASSWORD), MemberType.PRODUCER));
    }

    @Test
    void loginsWithValidEmailAndPassword() {
        MemberPrincipal principal = authService.login(EMAIL, PASSWORD);

        assertEquals(AuthRole.PRODUCER, principal.role());
    }

    @Test
    void rejectsUnknownEmail() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> authService.login("nobody@yesulin.art", PASSWORD)
        );

        assertEquals(AuthErrorCode.INVALID_CREDENTIALS, exception.getErrorCode());
    }

    @Test
    void rejectsWrongPasswordWithSameReason() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> authService.login(EMAIL, "wrong-password")
        );

        assertEquals(AuthErrorCode.INVALID_CREDENTIALS, exception.getErrorCode());
    }
}
