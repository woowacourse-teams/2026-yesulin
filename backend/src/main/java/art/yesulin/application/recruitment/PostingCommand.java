package art.yesulin.application.recruitment;

import java.time.LocalDateTime;
import java.util.List;

public record PostingCommand(
        String title,
        String status,
        boolean allowsMultipleRoles,
        LocalDateTime recruitmentStartsAt,
        LocalDateTime recruitmentEndsAt,
        String applicationGuide,
        List<PostingRoleSelection> roles,
        List<ScreeningRoundCommand> rounds,
        List<PostingFieldCommand> applicationFields) {

    public PostingCommand {
        roles = List.copyOf(roles);
        rounds = List.copyOf(rounds);
        applicationFields = List.copyOf(applicationFields);
    }
}
