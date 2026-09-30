package art.yesulin.domain.reservation;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;
import static art.yesulin.domain.reservation.ReservationErrorCode.INVALID_INPUT;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.reservation.converter.ReservationStatusConverter;
import art.yesulin.domain.reservation.event.ReservationCanceledEvent;
import art.yesulin.domain.reservation.event.ReservationConfirmedEvent;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.security.SecureRandom;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.springframework.data.domain.AbstractAggregateRoot;

/**
 * 무료 공연 회차 예매 한 건이다. 정원과 중복 예매 검사는 회차 행을 잠근 application service가 담당한다.
 */
@Entity
@Table(name = "reservations", uniqueConstraints = {
        @UniqueConstraint(name = "uk_reservations_code", columnNames = "code")
}, indexes = {
        @Index(name = "idx_reservations_session_status", columnList = "session_id, status"),
        @Index(name = "idx_reservations_session_phone", columnList = "session_id, booker_phone")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Reservation extends AbstractAggregateRoot<Reservation> {

    public static final int MAX_TICKET_COUNT = 10;
    private static final int CODE_LENGTH = 8;
    private static final String CODE_CHARACTERS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String CODE_PATTERN = "[" + CODE_CHARACTERS + "]{" + CODE_LENGTH + "}";
    private static final int MAX_DOCUMENT_VERSION_LENGTH = 100;
    private static final SecureRandom RANDOM = new SecureRandom();

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false, length = CODE_LENGTH)
    private String code;

    @Column(name = "session_id", nullable = false, updatable = false)
    private long sessionId;

    @Embedded
    private Booker booker;

    @Column(name = "ticket_count", nullable = false, updatable = false)
    private int ticketCount;

    @Column(name = "privacy_document_version", nullable = false, updatable = false,
            length = MAX_DOCUMENT_VERSION_LENGTH)
    private String privacyDocumentVersion;

    @Convert(converter = ReservationStatusConverter.class)
    @Column(nullable = false, length = 20)
    private ReservationStatus status;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "canceled_at")
    private Instant canceledAt;

    public Reservation(long sessionId, Booker booker, int ticketCount, String privacyDocumentVersion) {
        this(generateCode(), sessionId, booker, ticketCount, privacyDocumentVersion);
    }

    public Reservation(String code, long sessionId, Booker booker, int ticketCount, String privacyDocumentVersion) {
        this.code = requireCode(code);
        this.sessionId = requirePositive(sessionId, "회차 ID는 1 이상이어야 합니다.");
        this.booker = requireNonNull(booker, "예매자 정보는 필수입니다.");
        this.ticketCount = requireTicketCount(ticketCount);
        this.privacyDocumentVersion = requireDocumentVersion(privacyDocumentVersion);
        this.status = ReservationStatus.CONFIRMED;
    }

    /**
     * 운영자가 전화 요청을 받아 취소한다. 이미 취소된 예매는 현재 상태를 유지한다.
     */
    public void cancel(Instant canceledAt) {
        if (status == ReservationStatus.CANCELED) {
            return;
        }
        this.status = ReservationStatus.CANCELED;
        this.canceledAt = requireNonNull(canceledAt, "취소 시각은 필수입니다.");
        registerEvent(new ReservationCanceledEvent(id, sessionId, ticketCount));
    }

    public boolean isConfirmed() {
        return status == ReservationStatus.CONFIRMED;
    }

    @PostPersist
    private void registerConfirmedEvent() {
        registerEvent(new ReservationConfirmedEvent(id, sessionId, ticketCount));
    }

    private static String generateCode() {
        StringBuilder builder = new StringBuilder(CODE_LENGTH);
        for (int index = 0; index < CODE_LENGTH; index++) {
            builder.append(CODE_CHARACTERS.charAt(RANDOM.nextInt(CODE_CHARACTERS.length())));
        }
        return builder.toString();
    }

    private static String requireCode(String code) {
        String normalized = requireText(code, "예매번호는 필수입니다.");
        if (!normalized.matches(CODE_PATTERN)) {
            throw new IllegalArgumentException("예매번호 형식이 올바르지 않습니다.");
        }
        return normalized;
    }

    private static int requireTicketCount(int ticketCount) {
        if (ticketCount < 1 || ticketCount > MAX_TICKET_COUNT) {
            throw new BusinessException(INVALID_INPUT, "한 번에 1매 이상 10매 이하로 예매해 주세요.");
        }
        return ticketCount;
    }

    private static String requireDocumentVersion(String version) {
        String normalized = requireText(version, "개인정보 동의 문서 버전은 필수입니다.");
        if (normalized.length() > MAX_DOCUMENT_VERSION_LENGTH) {
            throw new IllegalArgumentException("개인정보 동의 문서 버전은 100자를 넘을 수 없습니다.");
        }
        return normalized;
    }
}
