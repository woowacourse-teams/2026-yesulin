package art.yesulin.domain.timetable.request;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.timetable.TimetableErrorCode.INVALID_INPUT;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.timetable.converter.TimetableRequestStatusConverter;
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
 * 바운더리 안에 맞는 빈 시간이 없는 배우가 남기는 시간 조정 요청이다. 기획사만 보고, 배우를 옮기거나 처리 완료로 닫는다.
 * 배우마다 열린 요청은 하나이며 다시 보내면 내용을 바꾼다.
 */
@Entity
@DynamicUpdate
@Table(name = "timetable_requests", indexes = {
        @Index(name = "idx_timetable_requests_timetable_status", columnList = "timetable_id, status"),
        @Index(name = "idx_timetable_requests_actor_status", columnList = "actor_id, status")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TimetableRequest {

    public static final int MAX_MESSAGE_LENGTH = 300;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "timetable_id", nullable = false, updatable = false)
    private long timetableId;

    @Column(name = "actor_id", nullable = false, updatable = false)
    private long actorId;

    @Column(nullable = false, length = MAX_MESSAGE_LENGTH)
    private String message;

    @Convert(converter = TimetableRequestStatusConverter.class)
    @Column(nullable = false, length = 20)
    private TimetableRequestStatus status;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    public TimetableRequest(long timetableId, long actorId, String message) {
        this.timetableId = requirePositive(timetableId, "일정표 ID는 1 이상이어야 합니다.");
        this.actorId = requirePositive(actorId, "배우 ID는 1 이상이어야 합니다.");
        this.message = requireMessage(message);
        this.status = TimetableRequestStatus.OPEN;
    }

    public void rewrite(String message) {
        this.message = requireMessage(message);
    }

    /** 이미 처리한 요청은 처음 처리 시각을 유지한다. */
    public void resolve(Instant now) {
        if (status == TimetableRequestStatus.RESOLVED) {
            return;
        }
        this.status = TimetableRequestStatus.RESOLVED;
        this.resolvedAt = requireNonNull(now, "처리 시각은 필수입니다.");
    }

    public boolean isOpen() {
        return status == TimetableRequestStatus.OPEN;
    }

    private static String requireMessage(String message) {
        String normalized = message == null ? "" : message.trim();
        if (normalized.isEmpty()) {
            throw new BusinessException(INVALID_INPUT, "가능한 시간이나 사정을 적어 주세요.");
        }
        if (normalized.length() > MAX_MESSAGE_LENGTH) {
            throw new BusinessException(INVALID_INPUT, "요청 내용은 %d자를 넘을 수 없습니다.", MAX_MESSAGE_LENGTH);
        }
        return normalized;
    }
}
