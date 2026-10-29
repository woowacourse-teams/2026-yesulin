package art.yesulin.event.domain.registration.visit;

import static art.yesulin.global.validation.DomainValidator.requirePositive;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Objects;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 명함 링크 접속 한 건. 개인 명함·방문자와 연결하지 않고 이벤트와 한국 날짜만 보관한다. */
@Getter
@Entity
@Table(name = "event_business_card_visits")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EventBusinessCardVisit {

    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, updatable = false)
    private long eventId;

    @Column(name = "visited_on", nullable = false, updatable = false)
    private LocalDate visitedOn;

    public EventBusinessCardVisit(long eventId, Instant visitedAt) {
        this.eventId = requirePositive(eventId, "이벤트 ID는 1 이상이어야 합니다.");
        this.visitedOn = LocalDate.ofInstant(Objects.requireNonNull(visitedAt), KOREA);
    }
}
