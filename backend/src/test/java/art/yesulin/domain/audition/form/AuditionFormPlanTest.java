package art.yesulin.domain.audition.form;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.AuditionErrorCode;
import java.util.List;
import java.util.stream.IntStream;
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
    void rejectsRequestedPhotosOverTotalLimit() {
        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new PhotoRequirementPlans(List.of(
                        new PhotoRequirementPlan(null, "정면", PhotoRequirementPlans.MAX_PHOTO_COUNT),
                        new PhotoRequirementPlan(null, "측면", 1)
                ))
        );

        assertEquals(AuditionErrorCode.INVALID_FORM, exception.getErrorCode());
    }

    @Test
    void acceptsRequestedPhotosAtTotalLimit() {
        PhotoRequirementPlans plans = new PhotoRequirementPlans(List.of(
                new PhotoRequirementPlan(null, "정면", PhotoRequirementPlans.MAX_PHOTO_COUNT - 1),
                new PhotoRequirementPlan(null, "측면", 1)
        ));

        assertEquals(2, plans.values().size());
    }

    @Test
    void rejectsVideoRequirementsOverLimit() {
        List<VideoRequirementPlan> requirements = IntStream
                .rangeClosed(1, VideoRequirementPlans.MAX_REQUIREMENT_COUNT + 1)
                .mapToObj(index -> video("자유 연기 " + index))
                .toList();

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new VideoRequirementPlans(requirements)
        );

        assertEquals(AuditionErrorCode.INVALID_FORM, exception.getErrorCode());
    }

    @Test
    void parsesStandardFieldNamesWithoutCaseSensitivity() {
        assertEquals(BasicInformationField.NAME, BasicInformationField.from("name"));
        assertEquals(BasicInformationField.ADDRESS, BasicInformationField.from("address"));
        assertEquals(AdditionalInformationField.CAREER, AdditionalInformationField.from("career"));
    }

    private VideoRequirementPlan video(String description) {
        return new VideoRequirementPlan(null, description);
    }
}
