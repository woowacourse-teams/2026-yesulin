package art.yesulin.domain.profile;

import static art.yesulin.domain.common.validation.DomainValidator.requireText;
import static art.yesulin.domain.profile.ProfileErrorCode.INVALID_PROFILE;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public record ProfileCareer(
        @Column(name = "career_year", nullable = false) int year,
        @Column(name = "title", nullable = false, length = MAX_TITLE_LENGTH) String title,
        @Column(name = "role_name", nullable = false, length = MAX_ROLE_NAME_LENGTH) String roleName
) {

    public static final int MAX_TITLE_LENGTH = 255;
    public static final int MAX_ROLE_NAME_LENGTH = 100;

    private static final int MINIMUM_YEAR = 1_000;
    private static final int MAXIMUM_YEAR = 9_999;

    public ProfileCareer {
        if (year < MINIMUM_YEAR || year > MAXIMUM_YEAR) {
            throw new BusinessException(INVALID_PROFILE, "경력 연도는 네 자리 숫자여야 합니다.");
        }
        title = requireText(title, "경력 작품명은 필수입니다.");
        if (title.length() > MAX_TITLE_LENGTH) {
            throw new BusinessException(INVALID_PROFILE, "경력 작품명은 255자를 넘을 수 없습니다.");
        }
        roleName = requireText(roleName, "경력 배역명은 필수입니다.");
        if (roleName.length() > MAX_ROLE_NAME_LENGTH) {
            throw new BusinessException(INVALID_PROFILE, "경력 배역명은 100자를 넘을 수 없습니다.");
        }
    }
}
