package art.yesulin.timetable.domain;

import static art.yesulin.timetable.domain.TimetableErrorCode.INVALID_INPUT;

import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TimetableProfile {

    public static final int MAX_TITLE_LENGTH = 60;
    public static final int MAX_ORGANIZER_NAME_LENGTH = 40;
    public static final int MAX_CONTACT_NAME_LENGTH = 30;
    public static final int MAX_LOCATION_LENGTH = 200;
    public static final int MAX_GUIDE_LENGTH = 1000;

    @Column(nullable = false, length = MAX_TITLE_LENGTH)
    private String title;

    @Column(name = "organizer_name", nullable = false, length = MAX_ORGANIZER_NAME_LENGTH)
    private String organizerName;

    @Column(name = "contact_name", nullable = false, length = MAX_CONTACT_NAME_LENGTH)
    private String contactName;

    @Column(name = "organizer_phone", nullable = false, length = MobilePhone.LENGTH)
    private String organizerPhone;

    @Column(nullable = false, length = MAX_LOCATION_LENGTH)
    private String location;

    @Column(nullable = false, length = MAX_GUIDE_LENGTH)
    private String guide;

    public TimetableProfile(
            String title,
            String organizerName,
            String contactName,
            String organizerPhone,
            String location,
            String guide
    ) {
        this.title = required(title, MAX_TITLE_LENGTH, "작품명을 입력해 주세요.", "작품명은 %d자를 넘을 수 없습니다.");
        this.organizerName = required(organizerName, MAX_ORGANIZER_NAME_LENGTH,
                "배우에게 안내할 단체명을 입력해 주세요.", "단체명은 %d자를 넘을 수 없습니다.");
        this.contactName = optional(contactName, MAX_CONTACT_NAME_LENGTH, "담당자명은 %d자를 넘을 수 없습니다.");
        this.organizerPhone = MobilePhone.require(organizerPhone, "담당자");
        this.location = optional(location, MAX_LOCATION_LENGTH, "오디션 장소는 %d자를 넘을 수 없습니다.");
        this.guide = optional(guide, MAX_GUIDE_LENGTH, "안내 사항은 %d자를 넘을 수 없습니다.");
    }

    public static TimetableProfile draft(String title) {
        TimetableProfile profile = new TimetableProfile();
        profile.title = required(title, MAX_TITLE_LENGTH, "일정 이름을 입력해 주세요.", "일정 이름은 %d자 이하로 입력해 주세요.");
        profile.organizerName = "";
        profile.contactName = "";
        profile.organizerPhone = "";
        profile.location = "";
        profile.guide = "";
        return profile;
    }

    private static String required(String value, int maxLength, String emptyMessage, String tooLongMessage) {
        String normalized = optional(value, maxLength, tooLongMessage);
        if (normalized.isEmpty()) {
            throw new BusinessException(INVALID_INPUT, emptyMessage);
        }
        return normalized;
    }

    private static String optional(String value, int maxLength, String tooLongMessage) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.length() > maxLength) {
            throw new BusinessException(INVALID_INPUT, tooLongMessage, maxLength);
        }
        return normalized;
    }
}
