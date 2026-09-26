package art.yesulin.domain.show;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.show.ShowErrorCode.INVALID_INPUT;
import static art.yesulin.domain.show.ShowErrorCode.SESSION_BOOKING_CLOSED;
import static art.yesulin.domain.show.ShowErrorCode.SESSION_CAPACITY_BELOW_RESERVED;
import static art.yesulin.domain.show.ShowErrorCode.SESSION_NOT_ENOUGH_SEATS;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

/**
 * 정원을 가진 공연 회차다. 예매는 이 행을 잠근 뒤 확정 매수를 다시 계산해 정원 초과를 막는다.
 */
@Entity
@Table(name = "show_sessions", indexes = {
        @Index(name = "idx_show_sessions_show_starts", columnList = "show_id, starts_at")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ShowSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "show_id", nullable = false, updatable = false)
    private long showId;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(nullable = false)
    private int capacity;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public ShowSession(long showId, Instant startsAt, int capacity) {
        this.showId = requirePositive(showId, "공연 ID는 1 이상이어야 합니다.");
        this.startsAt = requireNonNull(startsAt, "회차 시작 시각은 필수입니다.");
        this.capacity = requireCapacity(capacity);
    }

    public void update(Instant startsAt, int capacity, long reservedTickets) {
        int validCapacity = requireCapacity(capacity);
        if (validCapacity < reservedTickets) {
            throw new BusinessException(SESSION_CAPACITY_BELOW_RESERVED,
                    "정원은 이미 예매된 %d매보다 적을 수 없습니다.", reservedTickets);
        }
        this.startsAt = requireNonNull(startsAt, "회차 시작 시각은 필수입니다.");
        this.capacity = validCapacity;
    }

    public boolean isBookableAt(Instant now) {
        return requireNonNull(now, "기준 시각은 필수입니다.").isBefore(startsAt);
    }

    public void ensureReservable(Instant now, long reservedTickets, int requestedTickets) {
        if (!isBookableAt(now)) {
            throw new BusinessException(SESSION_BOOKING_CLOSED, "예매가 마감된 회차입니다.");
        }
        long remainingSeats = remainingSeats(reservedTickets);
        if (requestedTickets > remainingSeats) {
            throw new BusinessException(SESSION_NOT_ENOUGH_SEATS, "남은 좌석은 %d매입니다.", remainingSeats);
        }
    }

    public long remainingSeats(long reservedTickets) {
        return Math.max(0, capacity - reservedTickets);
    }

    boolean belongsTo(Long showId) {
        return Objects.equals(this.showId, showId);
    }

    private static int requireCapacity(int capacity) {
        if (capacity < 1) {
            throw new BusinessException(INVALID_INPUT, "회차 정원은 1명 이상이어야 합니다.");
        }
        return capacity;
    }
}
