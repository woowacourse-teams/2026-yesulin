package art.yesulin.timetable.domain;

import static art.yesulin.timetable.domain.TimetableErrorCode.INVALID_INPUT;

import art.yesulin.global.exception.BusinessException;

/** 문자를 받을 휴대폰 번호. 예매와 같은 010-1234-5678 형식만 저장한다. */
public final class MobilePhone {

    public static final int LENGTH = 13;

    private static final String PATTERN = "01\\d-\\d{3,4}-\\d{4}";

    private MobilePhone() {
    }

    public static String require(String phone, String subject) {
        String normalized = phone == null ? "" : phone.trim();
        if (normalized.isEmpty()) {
            throw new BusinessException(INVALID_INPUT, "%s 휴대폰 번호는 필수입니다.", subject);
        }
        if (!normalized.matches(PATTERN)) {
            throw new BusinessException(INVALID_INPUT, "%s 휴대폰 번호는 010-1234-5678 형식으로 입력해 주세요.", subject);
        }
        return normalized;
    }
}
