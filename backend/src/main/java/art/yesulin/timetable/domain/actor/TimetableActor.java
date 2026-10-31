package art.yesulin.timetable.domain.actor;

import static art.yesulin.global.validation.DomainValidator.requireNonNull;
import static art.yesulin.global.validation.DomainValidator.requirePositive;
import static art.yesulin.timetable.domain.TimetableErrorCode.INVALID_INPUT;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.timetable.domain.MobilePhone;
import art.yesulin.timetable.domain.TimetableBoard;
import art.yesulin.timetable.domain.TimetableKey;
import art.yesulin.timetable.domain.converter.TimetableAttendanceConverter;
import art.yesulin.timetable.domain.setting.TimeSlot;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.DynamicUpdate;

/**
 * 기획사가 일정표에 등록한 합격 배우다. 회원이 아니며 문자로 받은 개인 링크의 열쇠로 자기 일정만 본다.
 * 익명 일정의 배정은 일정표 행을 잠근 뒤 {@link TimetableBoard}를 거친다.
 * 계정 일정은 소유권 잠금 뒤 자유 날짜·시각을 배정하며 초대하지 않는다.
 */
@Entity
@DynamicUpdate
@Table(name = "timetable_actors", uniqueConstraints = {
        @UniqueConstraint(name = "uk_timetable_actors_access_key", columnNames = "access_key"),
        @UniqueConstraint(name = "uk_timetable_actors_phone", columnNames = {"timetable_id", "phone"}),
        @UniqueConstraint(name = "uk_timetable_actors_source", columnNames = {"timetable_id", "source_applicant_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TimetableActor {

    public static final int MAX_NAME_LENGTH = 30;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "timetable_id", nullable = false, updatable = false)
    private long timetableId;

    @Embedded
    @AttributeOverride(name = "value", column = @Column(name = "access_key", nullable = false, updatable = false))
    private TimetableKey accessKey;

    @Column(nullable = false, length = MAX_NAME_LENGTH)
    private String name;

    @Column(length = MobilePhone.LENGTH)
    private String phone;

    @Column(nullable = false, length = 254)
    private String email = "";

    @Column(name = "source_review_id", length = 36, updatable = false)
    private String sourceReviewId;

    @Column(name = "source_applicant_id", length = 36, updatable = false)
    private String sourceApplicantId;

    @Column(name = "role_name", nullable = false, length = 100)
    private String roleName = "";

    @Getter(AccessLevel.NONE)
    @Column(name = "slot_date")
    private LocalDate slotDate;

    @Getter(AccessLevel.NONE)
    @Column(name = "slot_start_time")
    private LocalTime slotStartTime;

    /** 합격·일정 안내 문자를 대기열에 넣은 시각. 배우 링크는 이 시각이 있어야 열린다. */
    @Column(name = "invited_at")
    private Instant invitedAt;

    @Convert(converter = TimetableAttendanceConverter.class)
    @Column(nullable = false, length = 20)
    private TimetableAttendance attendance = TimetableAttendance.UNANSWERED;

    @Column(name = "attendance_answered_at")
    private Instant attendanceAnsweredAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public TimetableActor(long timetableId, String name, String phone) {
        this.timetableId = requirePositive(timetableId, "일정표 ID는 1 이상이어야 합니다.");
        this.accessKey = TimetableKey.generate();
        this.name = requireName(name);
        this.phone = MobilePhone.require(phone, "‘" + this.name + "’ 배우의");
    }

    public static TimetableActor imported(long timetableId, String reviewId, String applicantId,
                                         String name, String phone, String email, String roleName) {
        TimetableActor actor = new TimetableActor();
        actor.timetableId = requirePositive(timetableId, "일정표 ID가 필요합니다.");
        actor.accessKey = TimetableKey.generate();
        actor.sourceReviewId = requireNonNull(reviewId, "심사함 ID가 필요합니다.");
        actor.sourceApplicantId = requireNonNull(applicantId, "지원자 ID가 필요합니다.");
        actor.roleName = requireNonNull(roleName, "배역 정보가 필요합니다.");
        actor.updateContact(name, phone, email);
        return actor;
    }

    /** 공연사 전용 초안 서비스에서만 호출한다. 누락된 번호는 null로 저장해 빈 번호끼리 중복되지 않는다. */
    public void updateContact(String name, String phone, String email) {
        String nextName = requireName(name);
        String nextPhone = phone == null || phone.isBlank() ? null : MobilePhone.require(phone, nextName);
        String nextEmail = email == null ? "" : email.trim();
        if (nextEmail.length() > 254 || (!nextEmail.isEmpty()
                && !nextEmail.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))) {
            throw new BusinessException(INVALID_INPUT, "이메일 주소를 확인해 주세요.");
        }
        this.name = nextName;
        this.phone = nextPhone;
        this.email = nextEmail;
    }

    /** 배정되지 않았으면 null이다. */
    public TimeSlot getSlot() {
        return slotDate == null || slotStartTime == null ? null : new TimeSlot(slotDate, slotStartTime);
    }

    public boolean isAssigned() {
        return slotDate != null;
    }

    public boolean isInvited() {
        return invitedAt != null;
    }

    /** 이미 안내했다면 처음 안내 시각을 유지한다. */
    public void markInvited(Instant now) {
        if (invitedAt == null) {
            this.invitedAt = requireNonNull(now, "안내 시각은 필수입니다.");
        }
    }

    public void assign(TimeSlot slot) {
        this.slotDate = slot == null ? null : slot.date();
        this.slotStartTime = slot == null ? null : slot.startTime();
        this.attendance = TimetableAttendance.UNANSWERED;
        this.attendanceAnsweredAt = null;
    }

    public void answerAttendance(TimetableAttendance answer, Instant now) {
        if (requireNonNull(answer, "참석 여부는 필수입니다.") == TimetableAttendance.UNANSWERED) {
            throw new BusinessException(INVALID_INPUT, "참석 또는 불참을 골라 주세요.");
        }
        this.attendance = answer;
        this.attendanceAnsweredAt = requireNonNull(now, "응답 시각은 필수입니다.");
    }

    private static String requireName(String name) {
        String normalized = name == null ? "" : name.trim();
        if (normalized.isEmpty()) {
            throw new BusinessException(INVALID_INPUT, "배우 이름을 입력해 주세요.");
        }
        if (normalized.length() > MAX_NAME_LENGTH) {
            throw new BusinessException(INVALID_INPUT, "배우 이름은 %d자를 넘을 수 없습니다.", MAX_NAME_LENGTH);
        }
        return normalized;
    }
}
