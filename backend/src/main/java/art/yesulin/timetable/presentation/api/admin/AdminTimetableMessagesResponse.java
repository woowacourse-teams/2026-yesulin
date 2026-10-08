package art.yesulin.timetable.presentation.api.admin;

import art.yesulin.timetable.application.admin.AdminTimetableMessageResult;
import java.util.List;

public record AdminTimetableMessagesResponse(List<AdminTimetableMessageResult> messages) {
}
