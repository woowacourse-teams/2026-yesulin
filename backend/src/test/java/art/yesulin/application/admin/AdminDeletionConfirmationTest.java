package art.yesulin.application.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.admin.AdminErrorCode;
import art.yesulin.infrastructure.auth.BcryptPasswordEncoder;
import at.favre.lib.crypto.bcrypt.BCrypt;
import java.time.Clock;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class AdminDeletionConfirmationTest {

    @Test
    void rejectsCorrectPasswordAfterFiveFailures() {
        AdminDeletionConfirmation confirmation = new AdminDeletionConfirmation(
                new BcryptPasswordEncoder(), BCrypt.withDefaults().hashToString(4, "correct-password".toCharArray()),
                Clock.systemUTC()
        );
        for (int attempt = 0; attempt < 5; attempt++) {
            assertThrows(BusinessException.class, () -> confirmation.verify(1L, "wrong-password"));
        }

        assertThrows(BusinessException.class, () -> confirmation.verify(1L, "correct-password"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "not-a-bcrypt-hash", "$2a$12$invalid"})
    void verifyRejectsMissingOrMalformedHash(String encodedPassword) {
        AdminDeletionConfirmation confirmation = new AdminDeletionConfirmation(
                new BcryptPasswordEncoder(), encodedPassword, Clock.systemUTC()
        );

        BusinessException exception = assertThrows(BusinessException.class,
                () -> confirmation.verify(1L, "test-private-password"));

        assertEquals(AdminErrorCode.DELETION_CONFIRMATION_FAILED, exception.getErrorCode());
    }
}
