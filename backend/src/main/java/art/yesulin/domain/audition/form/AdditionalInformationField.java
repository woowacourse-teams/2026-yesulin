package art.yesulin.domain.audition.form;

import static art.yesulin.domain.audition.AuditionErrorCode.INVALID_FORM;

import art.yesulin.common.exception.BusinessException;
import java.util.Locale;

public enum AdditionalInformationField {

    SCHOOL,
    LINK,
    NATIONALITY,
    COVER_LETTER,
    SPECIALTY,
    HOBBIES,
    MILITARY,
    CAREER;

    public static AdditionalInformationField from(String value) {
        if (value == null || value.isBlank()) {
            throw new BusinessException(INVALID_FORM, "추가정보 항목은 비어 있을 수 없습니다.");
        }
        try {
            return valueOf(value.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new BusinessException(INVALID_FORM, "지원 폼에서 사용할 수 없는 추가정보입니다.");
        }
    }
}
