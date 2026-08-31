package art.yesulin.application.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.admin.AdminErrorCode;
import art.yesulin.infrastructure.auth.BcryptPasswordEncoder;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class AdminDeletionConfirmationTest {

    @ParameterizedTest
    @ValueSource(strings = {"", "not-a-bcrypt-hash", "$2a$12$invalid"})
    void verifyRejectsMissingOrMalformedHash(String encodedPassword) {
        AdminDeletionConfirmation confirmation = new AdminDeletionConfirmation(
                new BcryptPasswordEncoder(), encodedPassword
        );

        BusinessException exception = assertThrows(BusinessException.class,
                () -> confirmation.verify("test-private-password"));

        assertEquals(AdminErrorCode.DELETION_CONFIRMATION_FAILED, exception.getErrorCode());
    }
}
