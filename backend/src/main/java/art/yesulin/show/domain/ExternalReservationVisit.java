package art.yesulin.show.domain;

import static art.yesulin.global.validation.DomainValidator.requirePositive;

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
import org.hibernate.annotations.CreationTimestamp;

/**
 * 관객이 외부 링크 공연에서 예매하기를 눌러 외부 예매 페이지로 이동한 기록이다. 예술in을 거쳐 예매하러 간 횟수를 세는 데만 쓰며
 * 관객 정보는 남기지 않는다.
 */
@Entity
@Table(name = "show_external_reservation_visits", indexes = {
        @Index(name = "idx_show_external_reservation_visits_show", columnList = "show_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ExternalReservationVisit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "show_id", nullable = false, updatable = false)
    private long showId;

    @CreationTimestamp
    @Column(name = "visited_at", nullable = false, updatable = false)
    private Instant visitedAt;

    public ExternalReservationVisit(long showId) {
        this.showId = requirePositive(showId, "공연 ID는 1 이상이어야 합니다.");
    }
}
