package art.yesulin.application.admin;

import art.yesulin.domain.timetable.Timetable;
import art.yesulin.domain.timetable.TimetableMessage;
import art.yesulin.domain.timetable.TimetableMessageStatus;
import art.yesulin.domain.timetable.TimetableMessageType;
import java.time.Instant;

/** 운영자가 직접 보낼 문자 한 건. 받는 번호와 본문을 그대로 복사해 보낸다. */
public record AdminTimetableMessageResult(
        long id,
        TimetableMessageType type,
        TimetableMessageStatus status,
        String timetableTitle,
        String organizerName,
        String recipientName,
        String recipientPhone,
        String body,
        Instant createdAt,
        Instant sentAt
) {

    static AdminTimetableMessageResult of(TimetableMessage message, Timetable timetable) {
        return new AdminTimetableMessageResult(
                message.getId(),
                message.getType(),
                message.getStatus(),
                timetable == null ? "" : timetable.getTitle(),
                timetable == null ? "" : timetable.getOrganizerName(),
                message.getRecipientName(),
                message.getRecipientPhone(),
                message.getBody(),
                message.getCreatedAt(),
                message.getSentAt()
        );
    }
}
