package art.yesulin.presentation.recruitment;

import art.yesulin.application.recruitment.PostingCommand;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

public record PostingRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Pattern(regexp = "UPCOMING|OPEN|CLOSED") String status,
        boolean allowsMultipleRoles,
        @NotNull OffsetDateTime recruitmentStartsAt,
        @NotNull OffsetDateTime recruitmentEndsAt,
        String applicationGuide) {

    PostingCommand toCommand() {
        return new PostingCommand(
                title,
                status,
                allowsMultipleRoles,
                recruitmentStartsAt.withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime(),
                recruitmentEndsAt.withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime(),
                applicationGuide);
    }
}
