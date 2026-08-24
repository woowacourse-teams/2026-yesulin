package art.yesulin.application.submission.form;

import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_FORM_ANSWER;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.form.AdditionalInformationField;
import art.yesulin.domain.audition.form.BasicInformationField;
import art.yesulin.domain.submission.SubmissionAdditionalInformation;
import art.yesulin.domain.submission.SubmissionBasicInformation;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
class SubmissionInformationValidator {

    void validate(
            SubmissionBasicInformation basicInformation,
            SubmissionAdditionalInformation additionalInformation,
            SubmissionFormDefinition form
    ) {
        validateBasicInformation(basicInformation, Set.copyOf(form.basicFields()));
        validateAdditionalInformation(additionalInformation, Set.copyOf(form.additionalFields()));
    }

    private void validateBasicInformation(
            SubmissionBasicInformation information,
            Set<BasicInformationField> configuredFields
    ) {
        for (BasicInformationField field : BasicInformationField.values()) {
            Object value = readBasicInformation(field, information);
            if (configuredFields.contains(field) && value == null) {
                throw invalid("공고에서 요구하는 기본 정보를 모두 입력해야 합니다.");
            }
            if (!configuredFields.contains(field) && hasValue(value)) {
                throw invalid("공고에서 요구하지 않은 기본 정보는 제출할 수 없습니다.");
            }
        }
    }

    private Object readBasicInformation(BasicInformationField field, SubmissionBasicInformation information) {
        return switch (field) {
            case NAME -> information.name();
            case HEIGHT -> information.height();
            case WEIGHT -> information.weight();
            case BIRTH -> information.birthDate();
            case GENDER -> information.gender();
            case PHONE -> information.phone();
            case EMAIL -> information.email();
            case ADDRESS -> information.address();
        };
    }

    private void validateAdditionalInformation(
            SubmissionAdditionalInformation information,
            Set<AdditionalInformationField> configuredFields
    ) {
        for (AdditionalInformationField field : AdditionalInformationField.values()) {
            Object value = readAdditionalInformation(field, information);
            if (!configuredFields.contains(field) && hasValue(value)) {
                throw invalid("공고에서 요구하지 않은 추가 정보는 제출할 수 없습니다.");
            }
        }
    }

    private Object readAdditionalInformation(
            AdditionalInformationField field,
            SubmissionAdditionalInformation information
    ) {
        return switch (field) {
            case SCHOOL -> information.school();
            case LINK -> information.links();
            case NATIONALITY -> information.nationality();
            case COVER_LETTER -> information.coverLetter();
            case SPECIALTY -> information.specialty();
            case HOBBIES -> information.hobbies();
            case MILITARY -> information.military();
            case CAREER -> information.careers();
        };
    }

    private boolean hasValue(Object value) {
        if (value instanceof List<?> values) {
            return !values.isEmpty();
        }
        return value != null;
    }

    private BusinessException invalid(String message) {
        return new BusinessException(INVALID_FORM_ANSWER, message);
    }
}
