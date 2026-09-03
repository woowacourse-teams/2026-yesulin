package art.yesulin.presentation.api.submission;

import art.yesulin.application.submission.SubmitAdditionalInformationCommand;
import art.yesulin.domain.submission.MilitaryServiceStatus;
import art.yesulin.domain.submission.SubmissionAdditionalInformation;
import art.yesulin.domain.submission.SubmissionEducationLevel;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Locale;

public record SubmitAdditionalInformationRequest(
        @Pattern(regexp = "(?i)NONE|HIGH_SCHOOL|UNIVERSITY") String educationLevel,
        @Size(max = SubmissionAdditionalInformation.MAX_SCHOOL_LENGTH) String school,
        @Size(max = SubmissionAdditionalInformation.MAX_SCHOOL_LENGTH) String major,
        @NotNull @Size(max = SubmissionAdditionalInformation.MAX_LINK_COUNT)
        List<@NotBlank @Size(max = SubmissionAdditionalInformation.MAX_LINK_LENGTH) String> links,
        @Size(max = SubmissionAdditionalInformation.MAX_NATIONALITY_LENGTH) String nationality,
        @Size(max = SubmissionAdditionalInformation.MAX_COVER_LETTER_LENGTH) String coverLetter,
        @Size(max = SubmissionAdditionalInformation.MAX_SPECIALTY_LENGTH) String specialty,
        @Size(max = SubmissionAdditionalInformation.MAX_HOBBIES_LENGTH) String hobbies,
        @Pattern(regexp = "(?i)COMPLETED|NOT_COMPLETED|NOT_APPLICABLE") String militaryServiceStatus,
        @NotNull @Size(max = SubmissionAdditionalInformation.MAX_CAREER_COUNT)
        List<@NotNull @Valid SubmitCareerRequest> careers
) {

    public SubmitAdditionalInformationRequest(
            String school,
            List<String> links,
            String nationality,
            String coverLetter,
            String specialty,
            String hobbies,
            String militaryServiceStatus,
            List<SubmitCareerRequest> careers
    ) {
        this(null, school, null, links, nationality, coverLetter, specialty, hobbies, militaryServiceStatus, careers);
    }

    SubmitAdditionalInformationCommand toCommand() {
        return new SubmitAdditionalInformationCommand(
                parseEducationLevel(),
                school,
                major,
                links,
                nationality,
                coverLetter,
                specialty,
                hobbies,
                parseMilitaryServiceStatus(),
                careers.stream().map(SubmitCareerRequest::toCommand).toList()
        );
    }

    private MilitaryServiceStatus parseMilitaryServiceStatus() {
        if (militaryServiceStatus == null) {
            return null;
        }
        return MilitaryServiceStatus.valueOf(militaryServiceStatus.toUpperCase(Locale.ROOT));
    }

    private SubmissionEducationLevel parseEducationLevel() {
        if (educationLevel == null) {
            return null;
        }
        return SubmissionEducationLevel.valueOf(educationLevel.toUpperCase(Locale.ROOT));
    }
}
