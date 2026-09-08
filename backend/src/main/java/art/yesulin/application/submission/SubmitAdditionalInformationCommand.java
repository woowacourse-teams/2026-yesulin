package art.yesulin.application.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;

import art.yesulin.domain.submission.MilitaryServiceStatus;
import art.yesulin.domain.submission.SubmissionAdditionalInformation;
import art.yesulin.domain.submission.SubmissionEducationLevel;
import java.util.List;

public record SubmitAdditionalInformationCommand(
        SubmissionEducationLevel educationLevel,
        String school,
        String major,
        List<String> links,
        String nationality,
        String coverLetter,
        String specialty,
        String hobbies,
        MilitaryServiceStatus militaryServiceStatus,
        List<SubmitCareerCommand> careers
) {

    public SubmitAdditionalInformationCommand {
        links = List.copyOf(requireNonNull(links, "외부 링크 목록은 필수입니다."));
        careers = List.copyOf(requireNonNull(careers, "경력 목록은 필수입니다."));
    }

    public SubmitAdditionalInformationCommand(
            String school,
            List<String> links,
            String nationality,
            String coverLetter,
            String specialty,
            String hobbies,
            MilitaryServiceStatus militaryServiceStatus,
            List<SubmitCareerCommand> careers
    ) {
        this(null, school, null, links, nationality, coverLetter, specialty, hobbies, militaryServiceStatus, careers);
    }

    SubmissionAdditionalInformation toInformation() {
        return new SubmissionAdditionalInformation(
                educationLevel,
                school,
                major,
                links,
                nationality,
                coverLetter,
                specialty,
                hobbies,
                militaryServiceStatus,
                careers.stream().map(SubmitCareerCommand::toCareer).toList()
        );
    }
}
