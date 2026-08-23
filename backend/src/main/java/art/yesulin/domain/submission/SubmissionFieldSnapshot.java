package art.yesulin.domain.submission;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.submission.SubmissionErrorCode.INVALID_SUBMISSION;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.submission.converter.SubmissionAdditionalInformationFieldConverter;
import art.yesulin.domain.submission.converter.SubmissionBasicInformationFieldConverter;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Embeddable
@EqualsAndHashCode
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SubmissionFieldSnapshot {

    @Column(name = "submission_field_snapshot_present", nullable = false, updatable = false)
    private boolean present = true;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "submission_basic_fields", joinColumns = @JoinColumn(name = "submission_id"))
    @OrderColumn(name = "field_order")
    @Column(name = "field", nullable = false, length = 50)
    @Convert(converter = SubmissionBasicInformationFieldConverter.class)
    private List<SubmissionBasicInformationField> basicFields = new ArrayList<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "submission_additional_fields", joinColumns = @JoinColumn(name = "submission_id"))
    @OrderColumn(name = "field_order")
    @Column(name = "field", nullable = false, length = 50)
    @Convert(converter = SubmissionAdditionalInformationFieldConverter.class)
    private List<SubmissionAdditionalInformationField> additionalFields = new ArrayList<>();

    public SubmissionFieldSnapshot(
            List<SubmissionBasicInformationField> basicFields,
            List<SubmissionAdditionalInformationField> additionalFields
    ) {
        this.basicFields = new ArrayList<>(copyUnique(basicFields, "제출 기본 정보 항목은 중복될 수 없습니다."));
        this.additionalFields = new ArrayList<>(copyUnique(
                additionalFields,
                "제출 추가 정보 항목은 중복될 수 없습니다."
        ));
    }

    private static <T> List<T> copyUnique(List<T> fields, String duplicateMessage) {
        List<T> safeFields = requireNonNull(fields, "제출 정보 항목은 필수입니다.");
        safeFields.forEach(field -> requireNonNull(field, "제출 정보 항목은 비어 있을 수 없습니다."));
        if (new HashSet<>(safeFields).size() != safeFields.size()) {
            throw new BusinessException(INVALID_SUBMISSION, duplicateMessage);
        }
        return List.copyOf(safeFields);
    }

    public List<SubmissionBasicInformationField> basicFields() {
        return List.copyOf(basicFields);
    }

    public List<SubmissionAdditionalInformationField> additionalFields() {
        return List.copyOf(additionalFields);
    }
}
