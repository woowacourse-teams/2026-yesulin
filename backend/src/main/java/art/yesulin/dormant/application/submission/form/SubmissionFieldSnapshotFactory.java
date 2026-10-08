package art.yesulin.dormant.application.submission.form;

import art.yesulin.dormant.domain.audition.form.AdditionalInformationField;
import art.yesulin.dormant.domain.audition.form.BasicInformationField;
import art.yesulin.dormant.domain.submission.SubmissionAdditionalInformationField;
import art.yesulin.dormant.domain.submission.SubmissionBasicInformationField;
import art.yesulin.dormant.domain.submission.SubmissionFieldSnapshot;
import org.springframework.stereotype.Component;

@Component
class SubmissionFieldSnapshotFactory {

    SubmissionFieldSnapshot create(SubmissionFormDefinition form) {
        return new SubmissionFieldSnapshot(
                form.basicFields().stream().map(this::mapBasicField).toList(),
                form.additionalFields().stream().map(this::mapAdditionalField).toList()
        );
    }

    private SubmissionBasicInformationField mapBasicField(BasicInformationField field) {
        return switch (field) {
            case NAME -> SubmissionBasicInformationField.NAME;
            case HEIGHT -> SubmissionBasicInformationField.HEIGHT;
            case WEIGHT -> SubmissionBasicInformationField.WEIGHT;
            case BIRTH -> SubmissionBasicInformationField.BIRTH;
            case GENDER -> SubmissionBasicInformationField.GENDER;
            case PHONE -> SubmissionBasicInformationField.PHONE;
            case EMAIL -> SubmissionBasicInformationField.EMAIL;
            case ADDRESS -> SubmissionBasicInformationField.ADDRESS;
        };
    }

    private SubmissionAdditionalInformationField mapAdditionalField(AdditionalInformationField field) {
        return switch (field) {
            case SCHOOL -> SubmissionAdditionalInformationField.SCHOOL;
            case LINK -> SubmissionAdditionalInformationField.LINK;
            case NATIONALITY -> SubmissionAdditionalInformationField.NATIONALITY;
            case COVER_LETTER -> SubmissionAdditionalInformationField.COVER_LETTER;
            case SPECIALTY -> SubmissionAdditionalInformationField.SPECIALTY;
            case HOBBIES -> SubmissionAdditionalInformationField.HOBBIES;
            case MILITARY -> SubmissionAdditionalInformationField.MILITARY;
            case CAREER -> SubmissionAdditionalInformationField.CAREER;
        };
    }
}
