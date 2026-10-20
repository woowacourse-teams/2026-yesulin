package art.yesulin.timetable.presentation.api;

import art.yesulin.timetable.domain.message.InvitationTemplate;
import jakarta.validation.constraints.Size;

public record InvitationTemplateRequest(@Size(max = InvitationTemplate.MAX_LENGTH) String template) {
}
