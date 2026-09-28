package art.yesulin.application.admin;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import org.junit.jupiter.api.Test;

class AdminFileDeletionConfirmationTest {

    @Test
    void acceptsOnlyConfiguredPassword() {
        AdminFileDeletionConfirmation confirmation = new AdminFileDeletionConfirmation("shared-secret");

        assertDoesNotThrow(() -> confirmation.verify("shared-secret"));
        assertThrows(BusinessException.class, () -> confirmation.verify("wrong-secret"));
    }

    @Test
    void rejectsDeletionWhenPasswordIsNotConfigured() {
        AdminFileDeletionConfirmation confirmation = new AdminFileDeletionConfirmation("");

        assertThrows(BusinessException.class, () -> confirmation.verify("shared-secret"));
    }
}
