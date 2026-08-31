package art.yesulin.application.admin;

import java.util.UUID;

public record DeleteSubmissionCommand(
        long actorMemberId,
        UUID submissionId,
        String confirmationPassword
) {

    @Override
    public String toString() {
        return "DeleteSubmissionCommand[actorMemberId=%d, submissionId=%s, confirmationPassword=[REDACTED]]"
                .formatted(actorMemberId, submissionId);
    }
}
