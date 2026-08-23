package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_SUBMISSION;

import art.yesulin.common.exception.BusinessException;
import java.time.LocalDate;

public record SubmissionBasicInformation(
        String name,
        Integer height,
        Integer weight,
        LocalDate birthDate,
        SubmissionGender gender,
        String phone,
        String email,
        String address
) {

    private static final String PHONE_PATTERN = "\\d{3}-\\d{4}-\\d{4}";

    public SubmissionBasicInformation {
        name = normalizeNullable(name);
        height = validatePositive(height, "키는 1 이상이어야 합니다.");
        weight = validatePositive(weight, "몸무게는 1 이상이어야 합니다.");
        phone = normalizeNullable(phone);
        email = normalizeNullable(email);
        address = normalizeNullable(address);
        validatePhone(phone);
    }

    private static Integer validatePositive(Integer value, String message) {
        if (value == null) {
            return null;
        }
        requirePositive(value, message);
        return value;
    }

    private static void validatePhone(String phone) {
        if (phone != null && !phone.matches(PHONE_PATTERN)) {
            throw new BusinessException(INVALID_SUBMISSION, "연락처는 000-0000-0000 형식이어야 합니다.");
        }
    }

    private static String normalizeNullable(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
