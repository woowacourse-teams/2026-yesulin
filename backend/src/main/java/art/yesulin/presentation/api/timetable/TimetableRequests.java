package art.yesulin.presentation.api.timetable;

/** 일정표 API 요청의 공통 형식. 도메인도 같은 규칙을 다시 검사한다. */
final class TimetableRequests {

    static final String KEY_HEADER = "X-Timetable-Key";
    static final String PHONE_PATTERN = "01\\d-\\d{3,4}-\\d{4}";
    static final String PHONE_MESSAGE = "휴대폰 번호는 010-1234-5678 형식으로 입력해 주세요.";

    private TimetableRequests() {
    }
}
