package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_SUBMISSION;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.submission.converter.SubmissionGenderConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Embeddable;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Embeddable
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SubmissionBasicInformation {

    public static final int MAX_NAME_LENGTH = 100;
    public static final int MAX_EMAIL_LENGTH = 254;
    public static final int MAX_ADDRESS_LENGTH = 100;

    private static final String PHONE_PATTERN = "\\d{3}-\\d{4}-\\d{4}";

    @Column(name = "basic_information_present", nullable = false, updatable = false)
    private boolean present = true;

    @Column(name = "applicant_name", updatable = false, length = MAX_NAME_LENGTH)
    private String name;

    @Column(name = "height_cm", updatable = false)
    private Integer height;

    @Column(name = "weight_kg", updatable = false)
    private Integer weight;

    @Column(name = "birth_date", updatable = false)
    private LocalDate birthDate;

    @Convert(converter = SubmissionGenderConverter.class)
    @Column(name = "gender", updatable = false, length = 20)
    private SubmissionGender gender;

    @Column(name = "phone", updatable = false, length = 13)
    private String phone;

    @Column(name = "email", updatable = false, length = MAX_EMAIL_LENGTH)
    private String email;

    @Column(name = "address", updatable = false, length = MAX_ADDRESS_LENGTH)
    private String address;

    public SubmissionBasicInformation(
            String name,
            Integer height,
            Integer weight,
            LocalDate birthDate,
            SubmissionGender gender,
            String phone,
            String email,
            String address
    ) {
        this.name = normalizeNullable(name, MAX_NAME_LENGTH, "이름은 100자를 넘을 수 없습니다.");
        this.height = validatePositive(height, "키는 1 이상이어야 합니다.");
        this.weight = validatePositive(weight, "몸무게는 1 이상이어야 합니다.");
        this.birthDate = birthDate;
        this.gender = gender;
        this.phone = normalizeNullable(phone);
        this.email = normalizeNullable(email, MAX_EMAIL_LENGTH, "이메일은 254자를 넘을 수 없습니다.");
        this.address = normalizeNullable(address, MAX_ADDRESS_LENGTH, "거주지는 100자를 넘을 수 없습니다.");
        validatePhone(this.phone);
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

    private static String normalizeNullable(String value, int maxLength, String message) {
        String normalizedValue = normalizeNullable(value);
        if (normalizedValue != null && normalizedValue.length() > maxLength) {
            throw new BusinessException(INVALID_SUBMISSION, message);
        }
        return normalizedValue;
    }

    public String name() {
        return name;
    }

    public Integer height() {
        return height;
    }

    public Integer weight() {
        return weight;
    }

    public LocalDate birthDate() {
        return birthDate;
    }

    public SubmissionGender gender() {
        return gender;
    }

    public String phone() {
        return phone;
    }

    public String email() {
        return email;
    }

    public String address() {
        return address;
    }
}
