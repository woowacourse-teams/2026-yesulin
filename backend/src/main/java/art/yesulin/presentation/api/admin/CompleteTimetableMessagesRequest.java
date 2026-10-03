package art.yesulin.presentation.api.admin;

import art.yesulin.application.admin.AdminTimetableMessageService;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public record CompleteTimetableMessagesRequest(
        @NotEmpty @Size(max = AdminTimetableMessageService.MAX_COMPLETION_SIZE)
        List<@NotNull @Positive Long> messageIds
) {
}
