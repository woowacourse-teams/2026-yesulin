package art.yesulin.presentation.api.admin;

import art.yesulin.application.admin.AdminTimetableMessageResult;
import java.util.List;

public record AdminTimetableMessagesResponse(List<AdminTimetableMessageResult> messages) {
}
