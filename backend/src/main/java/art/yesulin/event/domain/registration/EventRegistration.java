package art.yesulin.event.domain.registration;

import static art.yesulin.event.domain.EventErrorCode.INVALID_INPUT;
import static art.yesulin.global.validation.DomainValidator.requirePositive;

import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 로그인 없이 받은 이벤트 참가 신청 한 건. 같은 이벤트에는 휴대폰 번호 하나로 한 번만 신청한다.
 * 배우는 생년월일·프로필 사진·활동 분야와 경력(신입이면 경력 없음)이 필요하고, 공연사 관계자는 대신 소속과 하는 일을
 * 적는다.
 */
@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "event_registrations")
public class EventRegistration {

    public static final int MAX_NAME_LENGTH = 50;
    public static final int MAX_EMAIL_LENGTH = 254;
    public static final int MAX_SNS_HANDLE_LENGTH = 100;
    public static final int MAX_AFFILIATION_LENGTH = 500;
    public static final int MAX_OTHER_ACTIVITY_LENGTH = 50;
    public static final int MAX_CAREERS = 10;
    private static final Pattern PHONE = Pattern.compile("01[016789]-\\d{3,4}-\\d{4}");
    /** 도메인은 점을 뺀 조각끼리 점으로 잇게 맞춰, 긴 입력에서도 되돌아가며 다시 맞추는 일이 생기지 않게 한다. */
    private static final Pattern EMAIL = Pattern.compile("[^\\s@]+@[^\\s@.]+(?:\\.[^\\s@.]+)+");
    private static final LocalDate EARLIEST_BIRTH_DATE = LocalDate.of(1900, 1, 1);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, updatable = false)
    private long eventId;

    @Enumerated(EnumType.STRING)
    @Column(name = "participant_type", nullable = false, updatable = false, length = 20)
    private EventParticipantType participantType;

    @Column(nullable = false, updatable = false, length = MAX_NAME_LENGTH)
    private String name;

    @Column(nullable = false, updatable = false, length = 20)
    private String phone;

    @Column(nullable = false, updatable = false, length = MAX_EMAIL_LENGTH)
    private String email;

    @Column(name = "sns_handle", updatable = false, length = MAX_SNS_HANDLE_LENGTH)
    private String snsHandle;

    @Column(name = "birth_date", updatable = false)
    private LocalDate birthDate;

    @Column(name = "photo_key", updatable = false, length = 500)
    private String photoKey;

    @Column(updatable = false, length = MAX_AFFILIATION_LENGTH)
    private String affiliation;

    @Enumerated(EnumType.STRING)
    @ElementCollection
    @CollectionTable(name = "event_registration_activity_fields", joinColumns = @JoinColumn(name = "registration_id"))
    @Column(name = "activity_field", nullable = false, length = 20)
    private Set<EventActivityField> activityFields = new LinkedHashSet<>();

    @Column(name = "other_activity", updatable = false, length = MAX_OTHER_ACTIVITY_LENGTH)
    private String otherActivity;

    @Column(name = "no_career", nullable = false, updatable = false)
    private boolean noCareer;

    @ElementCollection
    @CollectionTable(name = "event_registration_careers", joinColumns = @JoinColumn(name = "registration_id"))
    @OrderColumn(name = "career_order")
    private List<EventRegistrationCareer> careers = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    /**
     * 신청서를 확인해 참가 신청을 만든다. 구분에 맞지 않는 칸은 버린다.
     *
     * @param photoKey 확정한 비공개 사진 저장소 키. 배우만 받는다.
     * @param today 생년월일이 미래인지 볼 한국 날짜
     */
    public EventRegistration(
            long eventId, EventRegistrationForm form, String photoKey, LocalDate today, Instant createdAt
    ) {
        if (form == null || form.participantType() == null) {
            throw invalid("참가 구분을 선택해 주세요.");
        }
        this.eventId = requirePositive(eventId, "이벤트 ID는 1 이상이어야 합니다.");
        this.participantType = form.participantType();
        this.name = required(form.name(), MAX_NAME_LENGTH, "이름");
        this.phone = phone(form.phone());
        this.email = email(form.email());
        this.snsHandle = optional(form.snsHandle(), MAX_SNS_HANDLE_LENGTH, "SNS 계정");
        if (participantType == EventParticipantType.ACTOR) {
            this.birthDate = birthDate(form.birthDate(), today);
            if (photoKey == null || photoKey.isBlank()) {
                throw invalid("프로필 사진을 올려 주세요.");
            }
            this.photoKey = photoKey;
            this.activityFields = activityFields(form.activityFields());
            this.otherActivity = this.activityFields.contains(EventActivityField.OTHER)
                    ? required(form.otherActivity(), MAX_OTHER_ACTIVITY_LENGTH, "기타 분야")
                    : null;
            this.noCareer = form.noCareer();
            this.careers = careers(form.noCareer(), form.careers());
        } else {
            this.affiliation = required(form.affiliation(), MAX_AFFILIATION_LENGTH, "소속과 하는 일");
        }
        this.createdAt = Objects.requireNonNull(createdAt);
    }

    /** 신청 화면과 같은 형식으로 휴대폰 번호를 정리한다. 숫자만 적어도 받는다. */
    public static String normalizePhone(String value) {
        if (value == null) {
            return null;
        }
        String digits = value.replaceAll("[^0-9]", "");
        if (digits.length() == 11) {
            return "%s-%s-%s".formatted(digits.substring(0, 3), digits.substring(3, 7), digits.substring(7));
        }
        if (digits.length() == 10) {
            return "%s-%s-%s".formatted(digits.substring(0, 3), digits.substring(3, 6), digits.substring(6));
        }
        return value.strip();
    }

    /** 정해진 순서(연극·뮤지컬·매체·유튜브·기타)로 정리한다. */
    private static Set<EventActivityField> activityFields(Set<EventActivityField> value) {
        if (value == null || value.isEmpty() || value.stream().anyMatch(Objects::isNull)) {
            throw invalid("활동 분야를 하나 이상 골라 주세요.");
        }
        return new LinkedHashSet<>(EnumSet.copyOf(value));
    }

    /** 신입이면 경력을 받지 않고, 아니면 한 줄 이상 {@value #MAX_CAREERS}줄까지 받는다. */
    private static List<EventRegistrationCareer> careers(boolean noCareer, List<EventRegistrationCareer> value) {
        List<EventRegistrationCareer> careers = value == null ? List.of() : value;
        if (careers.stream().anyMatch(Objects::isNull)) {
            throw invalid("경력을 확인해 주세요.");
        }
        if (noCareer) {
            if (!careers.isEmpty()) {
                throw invalid("경력 없음을 고르면 경력을 적지 않아요.");
            }
            return new ArrayList<>();
        }
        if (careers.isEmpty()) {
            throw invalid("경력을 한 줄 이상 적거나 경력 없음을 골라 주세요.");
        }
        if (careers.size() > MAX_CAREERS) {
            throw new BusinessException(INVALID_INPUT, "경력은 %d줄까지 적을 수 있습니다.", MAX_CAREERS);
        }
        return new ArrayList<>(careers);
    }

    private static String phone(String value) {
        String normalized = normalizePhone(value);
        if (normalized == null || !PHONE.matcher(normalized).matches()) {
            throw invalid("휴대폰 번호는 010-1234-5678 형식으로 입력해 주세요.");
        }
        return normalized;
    }

    private static String email(String value) {
        String normalized = required(value, MAX_EMAIL_LENGTH, "이메일");
        if (!EMAIL.matcher(normalized).matches()) {
            throw invalid("이메일 주소를 확인해 주세요.");
        }
        return normalized;
    }

    private static LocalDate birthDate(LocalDate value, LocalDate today) {
        if (value == null) {
            throw invalid("생년월일을 입력해 주세요.");
        }
        if (value.isBefore(EARLIEST_BIRTH_DATE) || (today != null && value.isAfter(today))) {
            throw invalid("생년월일을 확인해 주세요.");
        }
        return value;
    }

    private static String required(String value, int maxLength, String label) {
        String normalized = optional(value, maxLength, label);
        if (normalized == null) {
            throw new BusinessException(INVALID_INPUT, "%s을(를) 입력해 주세요.", label);
        }
        return normalized;
    }

    private static String optional(String value, int maxLength, String label) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.strip();
        if (normalized.length() > maxLength) {
            throw new BusinessException(INVALID_INPUT, "%s은(는) %d자 이내여야 합니다.", label, maxLength);
        }
        return normalized;
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(INVALID_INPUT, message);
    }
}
