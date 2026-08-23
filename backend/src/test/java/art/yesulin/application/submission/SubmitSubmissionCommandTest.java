package art.yesulin.application.submission;

import static org.junit.jupiter.api.Assertions.assertEquals;

import art.yesulin.domain.submission.MilitaryServiceStatus;
import art.yesulin.domain.submission.SubmissionAdditionalInformation;
import art.yesulin.domain.submission.SubmissionBasicInformation;
import art.yesulin.domain.submission.SubmissionGender;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class SubmitSubmissionCommandTest {

    @Test
    void createsSubmissionInformationFromCommand() {
        SubmitSubmissionCommand command = new SubmitSubmissionCommand(
                new SubmitBasicInformationCommand(
                        " 김하린 ", 165, 50, LocalDate.of(2000, 1, 1), SubmissionGender.FEMALE,
                        "010-1234-5678", "harin@example.com", " 서울시 마포구 "
                ),
                new SubmitAdditionalInformationCommand(
                        "한국예술종합학교",
                        List.of("https://example.com/harin"),
                        "대한민국",
                        "자기소개",
                        "현대무용",
                        "영화 감상",
                        MilitaryServiceStatus.NOT_APPLICABLE,
                        List.of(new SubmitCareerCommand(2025, "햄릿", "오필리어"))
                ),
                List.of(1L),
                emptyFormAnswers(),
                agreedConsents()
        );

        SubmissionBasicInformation basicInformation = command.toBasicInformation();
        assertEquals("김하린", basicInformation.name());
        assertEquals("서울시 마포구", basicInformation.address());
        assertEquals(SubmissionGender.FEMALE, basicInformation.gender());

        SubmissionAdditionalInformation additionalInformation = command.toAdditionalInformation();
        assertEquals(MilitaryServiceStatus.NOT_APPLICABLE, additionalInformation.military());
        assertEquals("오필리어", additionalInformation.careers().getFirst().roleName());
    }

    @Test
    void defensivelyCopiesInputCollections() {
        List<String> links = new ArrayList<>(List.of("https://example.com/harin"));
        List<SubmitCareerCommand> careers = new ArrayList<>();
        List<Long> selectedRoleIds = new ArrayList<>(List.of(1L));
        List<SubmitQuestionAnswerCommand> questionAnswers = new ArrayList<>();
        List<SubmitPhotoRequirementAnswerCommand> photoAnswers = new ArrayList<>();
        List<SubmitVideoRequirementAnswerCommand> videoAnswers = new ArrayList<>();
        SubmitFormAnswersCommand formAnswers = new SubmitFormAnswersCommand(
                questionAnswers,
                photoAnswers,
                videoAnswers
        );
        SubmitSubmissionCommand command = new SubmitSubmissionCommand(
                emptyBasicInformation(),
                new SubmitAdditionalInformationCommand(
                        null, links, null, null, null, null, null, careers
                ),
                selectedRoleIds,
                formAnswers,
                agreedConsents()
        );
        assertEquals(List.of(1L), command.selectedRoleIds());

        links.add("https://example.com/changed");
        careers.add(new SubmitCareerCommand(2025, "햄릿", "오필리어"));
        selectedRoleIds.add(2L);
        questionAnswers.add(new SubmitQuestionAnswerCommand(1L, "답변"));
        photoAnswers.add(new SubmitPhotoRequirementAnswerCommand(1L, 1L));
        videoAnswers.add(new SubmitVideoRequirementAnswerCommand(1L, "https://youtu.be/abcdefghijk"));

        assertEquals(List.of("https://example.com/harin"), command.additionalInformation().links());
        assertEquals(List.of(), command.additionalInformation().careers());
        assertEquals(List.of(1L), command.selectedRoleIds());
        assertEquals(List.of(), command.formAnswers().questionAnswers());
        assertEquals(List.of(), command.formAnswers().photoRequirementAnswers());
        assertEquals(List.of(), command.formAnswers().videoRequirementAnswers());
    }

    private SubmitBasicInformationCommand emptyBasicInformation() {
        return new SubmitBasicInformationCommand(null, null, null, null, null, null, null, null);
    }

    private SubmitFormAnswersCommand emptyFormAnswers() {
        return new SubmitFormAnswersCommand(List.of(), List.of(), List.of());
    }

    private SubmitConsentsCommand agreedConsents() {
        return new SubmitConsentsCommand(true, true);
    }
}
