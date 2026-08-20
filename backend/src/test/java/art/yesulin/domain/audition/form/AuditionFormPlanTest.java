package art.yesulin.domain.audition.form;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.AuditionErrorCode;
import java.util.List;
import org.junit.jupiter.api.Test;

class AuditionFormPlanTest {

    @Test
    void rejectsDuplicateStandardFields() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new ApplicationFields(
                        List.of(BasicInformationField.NAME, BasicInformationField.NAME),
                        List.of()
                )
        );

        assertEquals(AuditionErrorCode.INVALID_FORM, exception.getErrorCode());
    }

    @Test
    void rejectsMoreThanTenRequestedPhotosInTotal() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new PhotoRequirementPlans(List.of(
                        new PhotoRequirementPlan(null, "정면", 6),
                        new PhotoRequirementPlan(null, "측면", 5)
                ))
        );

        assertEquals(AuditionErrorCode.INVALID_FORM, exception.getErrorCode());
    }

    @Test
    void rejectsMoreThanFiveVideoRequirements() {
        List<VideoRequirementPlan> requirements = List.of(
                video("자유 연기 1"), video("자유 연기 2"), video("자유 연기 3"),
                video("자유 연기 4"), video("자유 연기 5"), video("자유 연기 6")
        );

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new VideoRequirementPlans(requirements)
        );

        assertEquals(AuditionErrorCode.INVALID_FORM, exception.getErrorCode());
    }

    @Test
    void parsesStandardFieldNamesWithoutCaseSensitivity() {
        assertEquals(BasicInformationField.NAME, BasicInformationField.from("name"));
        assertEquals(AdditionalInformationField.CAREER, AdditionalInformationField.from("career"));
    }

    private VideoRequirementPlan video(String description) {
        return new VideoRequirementPlan(null, description);
    }
}
