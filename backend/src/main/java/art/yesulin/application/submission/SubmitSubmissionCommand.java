package art.yesulin.application.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;

import art.yesulin.domain.submission.SubmissionAdditionalInformation;
import art.yesulin.domain.submission.SubmissionBasicInformation;
import java.util.List;

public record SubmitSubmissionCommand(
        SubmitBasicInformationCommand basicInformation,
        SubmitAdditionalInformationCommand additionalInformation,
        List<Long> selectedRoleIds,
        SubmitFormAnswersCommand formAnswers,
        SubmitConsentsCommand consents
) {

    public SubmitSubmissionCommand {
        basicInformation = requireNonNull(basicInformation, "기본 정보는 필수입니다.");
        additionalInformation = requireNonNull(additionalInformation, "추가 정보는 필수입니다.");
        selectedRoleIds = List.copyOf(requireNonNull(selectedRoleIds, "선택 배역 ID 목록은 필수입니다."));
        formAnswers = requireNonNull(formAnswers, "지원 폼 답변은 필수입니다.");
        consents = requireNonNull(consents, "지원서 동의 여부는 필수입니다.");
    }

    public SubmissionBasicInformation toBasicInformation() {
        return basicInformation.toInformation();
    }

    public SubmissionAdditionalInformation toAdditionalInformation() {
        return additionalInformation.toInformation();
    }
}
