package art.yesulin.domain.profile;

import static art.yesulin.domain.profile.ProfileErrorCode.INVALID_PROFILE;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.profile.converter.ProfileGenderConverter;
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
public class ProfileBasicInformation {

    public static final int MAX_NAME_LENGTH = 100;
    public static final int MAX_EMAIL_LENGTH = 254;
    public static final int MAX_ADDRESS_LENGTH = 100;

    private static final String PHONE_PATTERN = "\\d{3}-\\d{4}-\\d{4}";

    @Column(name = "profile_name", length = MAX_NAME_LENGTH)
    private String name;

    @Column(name = "height_cm")
    private Integer height;

    @Column(name = "weight_kg")
    private Integer weight;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Convert(converter = ProfileGenderConverter.class)
    @Column(name = "gender", length = 20)
    private ProfileGender gender;

    @Column(name = "phone", length = 13)
    private String phone;

    @Column(name = "profile_email", length = MAX_EMAIL_LENGTH)
    private String email;

    @Column(name = "address", length = MAX_ADDRESS_LENGTH)
    private String address;

    public ProfileBasicInformation(
            String name,
            Integer height,
            Integer weight,
            LocalDate birthDate,
            ProfileGender gender,
            String phone,
            String email,
            String address,
            LocalDate today
    ) {
        this.name = normalizeNullable(name, MAX_NAME_LENGTH, "이름은 100자를 넘을 수 없습니다.");
        this.height = validatePositive(height, "키는 1 이상이어야 합니다.");
        this.weight = validatePositive(weight, "몸무게는 1 이상이어야 합니다.");
        this.birthDate = validateBirthDate(birthDate, today);
        this.gender = gender;
        this.phone = normalizeNullable(phone);
        this.email = normalizeNullable(email, MAX_EMAIL_LENGTH, "이메일은 254자를 넘을 수 없습니다.");
        this.address = normalizeNullable(address, MAX_ADDRESS_LENGTH, "거주지는 100자를 넘을 수 없습니다.");
        validatePhone(this.phone);
    }

    public static ProfileBasicInformation empty() {
        return new ProfileBasicInformation();
    }

    private static Integer validatePositive(Integer value, String message) {
        if (value != null && value < 1) {
            throw new BusinessException(INVALID_PROFILE, message);
        }
        return value;
    }

    private static LocalDate validateBirthDate(LocalDate birthDate, LocalDate today) {
        if (birthDate != null && birthDate.isAfter(today)) {
            throw new BusinessException(INVALID_PROFILE, "생년월일은 미래일 수 없습니다.");
        }
        return birthDate;
    }

    private static void validatePhone(String phone) {
        if (phone != null && !phone.matches(PHONE_PATTERN)) {
            throw new BusinessException(INVALID_PROFILE, "연락처는 000-0000-0000 형식이어야 합니다.");
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
            throw new BusinessException(INVALID_PROFILE, message);
        }
        return normalizedValue;
    }

    public int filledCount() {
        int count = 0;
        count += name == null ? 0 : 1;
        count += height == null ? 0 : 1;
        count += weight == null ? 0 : 1;
        count += birthDate == null ? 0 : 1;
        count += gender == null ? 0 : 1;
        count += phone == null ? 0 : 1;
        count += email == null ? 0 : 1;
        count += address == null ? 0 : 1;
        return count;
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

    public ProfileGender gender() {
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
