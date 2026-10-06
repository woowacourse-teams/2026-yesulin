package art.yesulin.legacy.application.submission;

import art.yesulin.legacy.domain.submission.SubmissionBasicInformation;
import art.yesulin.legacy.domain.submission.SubmissionGender;
import java.time.LocalDate;

public record SubmitBasicInformationCommand(
        String name,
        Integer height,
        Integer weight,
        LocalDate birthDate,
        SubmissionGender gender,
        String phone,
        String email,
        String address
) {

    SubmissionBasicInformation toInformation() {
        return new SubmissionBasicInformation(name, height, weight, birthDate, gender, phone, email, address);
    }
}
