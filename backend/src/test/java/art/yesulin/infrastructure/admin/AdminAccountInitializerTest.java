package art.yesulin.infrastructure.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.application.auth.PasswordEncoder;
import art.yesulin.domain.member.Member;
import art.yesulin.domain.member.MemberRepository;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.support.ObjectStorageTestConfiguration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:admin-initializer;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@Import(ObjectStorageTestConfiguration.class)
class AdminAccountInitializerTest {

    private static final String EMAIL = "admin@yesulin.art";
    private static final String PASSWORD = "a-long-enough-passphrase";

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void setUp() {
        memberRepository.deleteAll();
    }

    private AdminAccountInitializer initializerFor(String accounts) {
        return new AdminAccountInitializer(new AdminAccountProperties(accounts), memberRepository, passwordEncoder);
    }

    @Test
    void createsConfiguredAdminAccount() {
        initializerFor("%s:%s".formatted(EMAIL, PASSWORD)).run(null);

        Member admin = memberRepository.findByEmail(EMAIL).orElseThrow();
        assertEquals(MemberType.ADMIN, admin.getType());
        assertEquals(MemberStatus.ACTIVE, admin.getStatus());
        assertTrue(passwordEncoder.matches(PASSWORD, admin.getPassword()));
    }

    @Test
    void keepsExistingAdminOnRestart() {
        initializerFor("%s:%s".formatted(EMAIL, PASSWORD)).run(null);
        long firstId = memberRepository.findByEmail(EMAIL).orElseThrow().getId();

        initializerFor("%s:%s".formatted(EMAIL, PASSWORD)).run(null);

        assertEquals(firstId, memberRepository.findByEmail(EMAIL).orElseThrow().getId());
        assertEquals(1, memberRepository.count());
    }

    @Test
    void rotatesPasswordWhenConfigurationChanges() {
        initializerFor("%s:%s".formatted(EMAIL, PASSWORD)).run(null);
        String firstHash = memberRepository.findByEmail(EMAIL).orElseThrow().getPassword();

        initializerFor("%s:%s".formatted(EMAIL, "another-long-passphrase")).run(null);

        Member admin = memberRepository.findByEmail(EMAIL).orElseThrow();
        assertNotEquals(firstHash, admin.getPassword());
        assertTrue(passwordEncoder.matches("another-long-passphrase", admin.getPassword()));
    }

    @Test
    void createsNothingWhenNotConfigured() {
        initializerFor("").run(null);

        assertEquals(0, memberRepository.count());
    }

    @Test
    void refusesToPromoteExistingProducerAccount() {
        memberRepository.save(Member.ofProducer(EMAIL, "hash"));

        AdminAccountInitializer initializer = initializerFor("%s:%s".formatted(EMAIL, PASSWORD));

        assertThrows(IllegalStateException.class, () -> initializer.run(null));
    }

    @Test
    void rejectsShortPassword() {
        AdminAccountInitializer initializer = initializerFor("%s:short".formatted(EMAIL));

        assertThrows(IllegalStateException.class, () -> initializer.run(null));
    }

    @Test
    void hidesPasswordFromToString() {
        AdminAccount account = AdminAccount.parse("%s:%s".formatted(EMAIL, PASSWORD));

        assertFalse(account.toString().contains(PASSWORD));
    }

    @Test
    void rejectsPasswordWithComma() {
        AdminAccountInitializer initializer = initializerFor("%s:has,a,comma-and-long".formatted(EMAIL));

        assertThrows(IllegalStateException.class, () -> initializer.run(null));
    }

    @Test
    void keepsColonInsidePassword() {
        AdminAccount account = AdminAccount.parse("%s:pass:word-long-enough".formatted(EMAIL));

        assertEquals("pass:word-long-enough", account.password());
    }

    @Test
    void rejectsMalformedEntry() {
        AdminAccountInitializer initializer = initializerFor("no-separator-here");

        assertThrows(IllegalStateException.class, () -> initializer.run(null));
    }
}
