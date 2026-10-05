package art.yesulin.domain.timetable.message;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;

import art.yesulin.domain.timetable.MobilePhone;
import art.yesulin.domain.timetable.converter.TimetableMessageStatusConverter;
import art.yesulin.domain.timetable.converter.TimetableMessageTypeConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.DynamicUpdate;

/**
 * 일정표 때문에 보내야 하는 문자 한 건이다. 기획사 화면에는 자동 발송으로 안내하지만, 지금은 운영자가 대기열을 보고
 * 직접 보낸 뒤 발송 완료로 표시한다. 받는 번호와 본문은 넣을 때의 값으로 고정한다.
 */
@Entity
@DynamicUpdate
@Table(name = "timetable_messages", indexes = {
        @Index(name = "idx_timetable_messages_status_created", columnList = "status, created_at"),
        @Index(name = "idx_timetable_messages_timetable_status", columnList = "timetable_id, status"),
        @Index(name = "idx_timetable_messages_actor_status", columnList = "actor_id, status")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TimetableMessage {

    public static final int MAX_BODY_LENGTH = 1000;
    private static final int MAX_RECIPIENT_NAME_LENGTH = 40;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "timetable_id", nullable = false, updatable = false)
    private long timetableId;

    /** 기획사에게 보내는 문자는 null이다. */
    @Column(name = "actor_id", updatable = false)
    private Long actorId;

    @Convert(converter = TimetableMessageTypeConverter.class)
    @Column(name = "message_type", nullable = false, updatable = false, length = 40)
    private TimetableMessageType type;

    @Column(name = "recipient_name", nullable = false, updatable = false, length = MAX_RECIPIENT_NAME_LENGTH)
    private String recipientName;

    @Column(name = "recipient_phone", nullable = false, updatable = false, length = MobilePhone.LENGTH)
    private String recipientPhone;

    @Column(nullable = false, updatable = false, length = MAX_BODY_LENGTH)
    private String body;

    @Convert(converter = TimetableMessageStatusConverter.class)
    @Column(nullable = false, length = 20)
    private TimetableMessageStatus status;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "sent_at")
    private Instant sentAt;

    /** 발송 완료로 표시한 운영자 회원 ID. 문자 업체로 자동 발송하면 null로 둔다. */
    @Column(name = "sent_by")
    private Long sentBy;

    public TimetableMessage(
            long timetableId,
            Long actorId,
            TimetableMessageType type,
            String recipientName,
            String recipientPhone,
            String body
    ) {
        this.timetableId = requirePositive(timetableId, "일정표 ID는 1 이상이어야 합니다.");
        this.actorId = actorId;
        this.type = requireNonNull(type, "문자 종류는 필수입니다.");
        this.recipientName = truncate(requireText(recipientName, "받는 사람 이름은 필수입니다."), MAX_RECIPIENT_NAME_LENGTH);
        this.recipientPhone = MobilePhone.require(recipientPhone, "받는 사람");
        this.body = requireBody(body);
        this.status = TimetableMessageStatus.PENDING;
    }

    /** 이미 보낸 문자는 처음 발송 기록을 유지한다. */
    public void markSent(Long operatorId, Instant now) {
        if (status == TimetableMessageStatus.SENT) {
            return;
        }
        this.status = TimetableMessageStatus.SENT;
        this.sentAt = requireNonNull(now, "발송 시각은 필수입니다.");
        this.sentBy = operatorId;
    }

    public boolean isPending() {
        return status == TimetableMessageStatus.PENDING;
    }

    private static String requireBody(String body) {
        String normalized = requireText(body, "문자 본문은 필수입니다.");
        if (normalized.length() > MAX_BODY_LENGTH) {
            throw new IllegalArgumentException("문자 본문은 1000자를 넘을 수 없습니다.");
        }
        return normalized;
    }

    private static String truncate(String value, int maxLength) {
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
