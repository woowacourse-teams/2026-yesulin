package art.yesulin.audit.application;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.audit.domain.AuditErrorCode;
import art.yesulin.global.exception.BusinessException;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class AuditResetPolicyTest {

    private static final String KEY = "yesulin.pdf-review.reset-allowed-member-ids";

    @Test
    void allowsListedDemoAccount() {
        AuditResetPolicy policy = new AuditResetPolicy(Set.of(59L));

        assertDoesNotThrow(() -> policy.requireAllowed(59L));
    }

    @Test
    void rejectsAccountOutsideList() {
        AuditResetPolicy policy = new AuditResetPolicy(Set.of(59L));

        BusinessException error = assertThrows(BusinessException.class, () -> policy.requireAllowed(60L));

        assertEquals(AuditErrorCode.PDF_REVIEW_RESET_FORBIDDEN, error.getErrorCode());
    }

    @Test
    void emptyListRejectsEveryone() {
        AuditResetPolicy policy = new AuditResetPolicy(null);

        assertThrows(BusinessException.class, () -> policy.requireAllowed(59L));
    }

    @Test
    void bindsConfiguredIdsAndTreatsBlankAsEmpty() {
        ApplicationContextRunner runner = new ApplicationContextRunner().withUserConfiguration(Binding.class);

        runner.withPropertyValues(KEY + "=59")
                .run(context -> assertEquals(Set.of(59L), allowed(context.getBean(AuditResetPolicy.class))));
        runner.withPropertyValues(KEY + "=")
                .run(context -> assertEquals(Set.of(), allowed(context.getBean(AuditResetPolicy.class))));
    }

    private static Set<Long> allowed(AuditResetPolicy policy) {
        return policy.resetAllowedMemberIds();
    }

    @EnableConfigurationProperties(AuditResetPolicy.class)
    static class Binding {
    }
}
