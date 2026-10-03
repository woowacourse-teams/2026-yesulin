package art.yesulin.domain.timetable;

import static art.yesulin.domain.timetable.TimetableErrorCode.INVALID_INPUT;

import art.yesulin.common.exception.BusinessException;

/**
 * 일정표의 안내 정보다. 단체명은 배우에게 가는 합격 안내 문자에, 기획사 번호는 관리 링크와 요청 알림 문자에 쓴다.
 * 장소와 안내 사항은 선택이며 빈 문자열로 저장한다.
 */
public record TimetableProfile(
        String title,
        String organizerName,
        String organizerPhone,
        String location,
        String guide
) {

    public static final int MAX_TITLE_LENGTH = 60;
    public static final int MAX_ORGANIZER_NAME_LENGTH = 40;
    public static final int MAX_LOCATION_LENGTH = 200;
    public static final int MAX_GUIDE_LENGTH = 1000;

    public TimetableProfile {
        title = normalize(title, MAX_TITLE_LENGTH, "일정표 이름은 %d자를 넘을 수 없습니다.");
        if (title.isEmpty()) {
            throw new BusinessException(INVALID_INPUT, "일정표 이름을 입력해 주세요.");
        }
        organizerName = normalize(organizerName, MAX_ORGANIZER_NAME_LENGTH, "단체명은 %d자를 넘을 수 없습니다.");
        if (organizerName.isEmpty()) {
            throw new BusinessException(INVALID_INPUT, "배우에게 안내할 단체명을 입력해 주세요.");
        }
        organizerPhone = MobilePhone.require(organizerPhone, "담당자");
        location = normalize(location, MAX_LOCATION_LENGTH, "오디션 장소는 %d자를 넘을 수 없습니다.");
        guide = normalize(guide, MAX_GUIDE_LENGTH, "안내 사항은 %d자를 넘을 수 없습니다.");
    }

    private static String normalize(String value, int maxLength, String tooLongMessage) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.length() > maxLength) {
            throw new BusinessException(INVALID_INPUT, tooLongMessage, maxLength);
        }
        return normalized;
    }
}
