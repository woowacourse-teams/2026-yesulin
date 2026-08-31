package art.yesulin.presentation.api.admin;

import art.yesulin.application.admin.DeleteSubmissionCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record DeleteAdminSubmissionRequest(
        @NotBlank
        @Size(max = 128)
        String confirmationPassword
) {

    @Override
    public String toString() {
        return "DeleteAdminSubmissionRequest[confirmationPassword=[REDACTED]]";
    }

    DeleteSubmissionCommand toCommand(long actorMemberId, UUID submissionId) {
        return new DeleteSubmissionCommand(actorMemberId, submissionId, confirmationPassword);
    }
}
