package art.yesulin.infrastructure.screening.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class ScreeningSubmissionCareerEntity {

    @Column(name = "career_year", nullable = false)
    private int year;

    @Column(name = "career_title", nullable = false, length = 200)
    private String title;

    @Column(name = "career_part", nullable = false, length = 100)
    private String part;
}
