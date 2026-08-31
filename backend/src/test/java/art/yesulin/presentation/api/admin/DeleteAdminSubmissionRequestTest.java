package art.yesulin.presentation.api.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.application.admin.DeleteSubmissionCommand;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class DeleteAdminSubmissionRequestTest {

    @Test
    void masksPasswordInRequestAndCommandWithoutChangingVerificationValue() {
        String password = "fake-private-deletion-password";
        UUID submissionId = UUID.randomUUID();
        DeleteAdminSubmissionRequest request = new DeleteAdminSubmissionRequest(password);
        DeleteSubmissionCommand command = request.toCommand(42L, submissionId);

        assertFalse(request.toString().contains(password));
        assertTrue(request.toString().contains("[REDACTED]"));
        assertFalse(command.toString().contains(password));
        assertTrue(command.toString().contains("[REDACTED]"));
        assertEquals(password, command.confirmationPassword());
        assertEquals(42L, command.actorMemberId());
        assertEquals(submissionId, command.submissionId());
    }
}
