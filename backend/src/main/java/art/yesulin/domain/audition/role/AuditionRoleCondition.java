package art.yesulin.domain.audition.role;

import static art.yesulin.domain.audition.AuditionErrorCode.INVALID_ROLE_SECTION;
import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.role.converter.RoleGenderConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuditionRoleCondition {

    private static final int MINIMUM_RECRUITMENT_COUNT = 1;
    private static final int MINIMUM_AGE = 0;
    private static final int GENDER_COLUMN_LENGTH = 10;

    @Column(name = "recruitment_count", nullable = false)
    private int recruitmentCount;

    @Convert(converter = RoleGenderConverter.class)
    @Column(name = "gender_requirement", nullable = false, length = GENDER_COLUMN_LENGTH)
    private RoleGender gender;

    @Column(name = "minimum_age", nullable = false)
    private int minimumAge;

    @Column(name = "maximum_age", nullable = false)
    private int maximumAge;

    public AuditionRoleCondition(int recruitmentCount, RoleGender gender, int minimumAge, int maximumAge) {
        if (recruitmentCount < MINIMUM_RECRUITMENT_COUNT) {
            throw new BusinessException(INVALID_ROLE_SECTION, "배역 모집 인원은 1명 이상이어야 합니다.");
        }
        if (minimumAge < MINIMUM_AGE || maximumAge < MINIMUM_AGE || minimumAge > maximumAge) {
            throw new BusinessException(INVALID_ROLE_SECTION, "배역 나이 조건을 올바르게 입력해야 합니다.");
        }
        this.recruitmentCount = recruitmentCount;
        this.gender = requireNonNull(gender, "배역 성별 조건은 필수입니다.");
        this.minimumAge = minimumAge;
        this.maximumAge = maximumAge;
    }
}
