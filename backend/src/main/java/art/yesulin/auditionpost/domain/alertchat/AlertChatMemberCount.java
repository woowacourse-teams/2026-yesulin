package art.yesulin.auditionpost.domain.alertchat;

import static art.yesulin.auditionpost.domain.AuditionPostErrorCode.INVALID_INPUT;

import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.Column;
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

/**
 * 운영자가 적은 공고 알림 오픈채팅방 인원. 적은 시각부터 올라오는 공고에 적용한다. 이미 올라온 공고의 조회수가 바뀌지 않도록
 * 고치거나 지우지 않고 새로 적기만 한다.
 */
@Entity
@Table(
        name = "audition_alert_chat_member_counts",
        indexes = @Index(name = "idx_audition_alert_chat_member_counts_recorded", columnList = "recorded_at, id")
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AlertChatMemberCount {

    /** 잘못 친 숫자를 막는 상한. */
    public static final int MAX_MEMBER_COUNT = 10_000;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_count", nullable = false, updatable = false)
    private int memberCount;

    @Column(name = "recorded_by", nullable = false, updatable = false)
    private long recordedBy;

    @Column(name = "recorded_at", nullable = false, updatable = false)
    private Instant recordedAt;

    public AlertChatMemberCount(int memberCount, long recordedBy, Instant recordedAt) {
        if (memberCount < 1 || memberCount > MAX_MEMBER_COUNT) {
            throw invalid("오픈채팅방 인원은 1~%,d명이어야 합니다.".formatted(MAX_MEMBER_COUNT));
        }
        if (recordedBy <= 0 || recordedAt == null) {
            throw invalid("인원을 적은 운영자와 시각이 올바르지 않습니다.");
        }
        this.memberCount = memberCount;
        this.recordedBy = recordedBy;
        this.recordedAt = recordedAt;
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(INVALID_INPUT, message);
    }
}
