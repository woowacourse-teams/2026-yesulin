package art.yesulin.domain.submission;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.common.exception.BusinessException;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class SubmissionAdditionalInformationTest {

    @Test
    void copiesListValuesAndNormalizesOptionalText() {
        List<String> sourceLinks = new ArrayList<>(List.of(" https://example.com/profile "));
        List<SubmissionCareer> sourceCareers = new ArrayList<>(List.of(
                new SubmissionCareer(2025, " 햄릿 ", " 오필리어 ")
        ));
        SubmissionAdditionalInformation information = new SubmissionAdditionalInformation(
                " ", sourceLinks, " 대한민국 ", null, null, null,
                MilitaryServiceStatus.COMPLETED, sourceCareers
        );

        sourceLinks.add("https://example.com/changed");
        sourceCareers.add(new SubmissionCareer(2024, "리어왕", "코델리아"));

        assertNull(information.school());
        assertEquals("대한민국", information.nationality());
        assertEquals(MilitaryServiceStatus.COMPLETED, information.military());
        assertEquals(List.of("https://example.com/profile"), information.links());
        assertEquals(List.of(new SubmissionCareer(2025, "햄릿", "오필리어")), information.careers());
    }

    @Test
    void rejectsMoreThanFiveLinks() {
        List<String> links = List.of("1", "2", "3", "4", "5", "6");

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new SubmissionAdditionalInformation(
                        null, links, null, null, null, null, null, List.of()
                )
        );

        assertEquals(SubmissionErrorCode.INVALID_SUBMISSION, exception.getErrorCode());
    }

    @Test
    void rejectsMoreThanTenCareers() {
        List<SubmissionCareer> careers = new ArrayList<>();
        for (int index = 0; index < 11; index++) {
            careers.add(new SubmissionCareer(2025, "작품 " + index, "배역 " + index));
        }

        BusinessException exception = assertThrows(
                BusinessException.class,
                () -> new SubmissionAdditionalInformation(
                        null, List.of(), null, null, null, null, null, careers
                )
        );

        assertEquals(SubmissionErrorCode.INVALID_SUBMISSION, exception.getErrorCode());
    }

    @Test
    void rejectsTextOverMaximumLengths() {
        assertAll(
                () -> assertThrows(
                        BusinessException.class,
                        () -> new SubmissionAdditionalInformation(
                                "가".repeat(SubmissionAdditionalInformation.MAX_SCHOOL_LENGTH + 1),
                                List.of(), null, null, null, null, null, List.of()
                        )
                ),
                () -> assertThrows(
                        BusinessException.class,
                        () -> new SubmissionAdditionalInformation(
                                null,
                                List.of("a".repeat(SubmissionAdditionalInformation.MAX_LINK_LENGTH + 1)),
                                null, null, null, null, null, List.of()
                        )
                ),
                () -> assertThrows(
                        BusinessException.class,
                        () -> new SubmissionAdditionalInformation(
                                null, List.of(),
                                "가".repeat(SubmissionAdditionalInformation.MAX_NATIONALITY_LENGTH + 1),
                                null, null, null, null, List.of()
                        )
                ),
                () -> assertThrows(
                        BusinessException.class,
                        () -> new SubmissionAdditionalInformation(
                                null, List.of(), null,
                                "가".repeat(SubmissionAdditionalInformation.MAX_COVER_LETTER_LENGTH + 1),
                                null, null, null, List.of()
                        )
                ),
                () -> assertThrows(
                        BusinessException.class,
                        () -> new SubmissionAdditionalInformation(
                                null, List.of(), null, null,
                                "가".repeat(SubmissionAdditionalInformation.MAX_SPECIALTY_LENGTH + 1),
                                null, null, List.of()
                        )
                ),
                () -> assertThrows(
                        BusinessException.class,
                        () -> new SubmissionAdditionalInformation(
                                null, List.of(), null, null, null,
                                "가".repeat(SubmissionAdditionalInformation.MAX_HOBBIES_LENGTH + 1),
                                null, List.of()
                        )
                )
        );
    }

    @Test
    void rejectsCareerTextOverMaximumLengths() {
        assertAll(
                () -> assertThrows(
                        BusinessException.class,
                        () -> new SubmissionCareer(
                                2025,
                                "가".repeat(SubmissionCareer.MAX_TITLE_LENGTH + 1),
                                "배역"
                        )
                ),
                () -> assertThrows(
                        BusinessException.class,
                        () -> new SubmissionCareer(
                                2025,
                                "작품",
                                "가".repeat(SubmissionCareer.MAX_ROLE_NAME_LENGTH + 1)
                        )
                )
        );
    }
}
