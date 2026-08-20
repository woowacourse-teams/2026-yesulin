package art.yesulin.domain.audition.form;

import static art.yesulin.domain.audition.AuditionErrorCode.INVALID_FORM;

import art.yesulin.common.exception.BusinessException;
import java.util.Locale;

public enum BasicInformationField {

    NAME,
    HEIGHT,
    WEIGHT,
    BIRTH,
    GENDER,
    PHONE,
    EMAIL,
    ADDRESS;

    public static BasicInformationField from(String value) {
        if (value == null || value.isBlank()) {
            throw new BusinessException(INVALID_FORM, "기본사항 항목은 비어 있을 수 없습니다.");
        }
        try {
            return valueOf(value.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new BusinessException(INVALID_FORM, "지원 폼에서 사용할 수 없는 기본사항입니다.");
        }
    }
}
