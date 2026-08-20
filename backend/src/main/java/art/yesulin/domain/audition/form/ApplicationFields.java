package art.yesulin.domain.audition.form;

import static art.yesulin.domain.audition.AuditionErrorCode.INVALID_FORM;
import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.audition.form.converter.AdditionalInformationFieldConverter;
import art.yesulin.domain.audition.form.converter.BasicInformationFieldConverter;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embeddable;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ApplicationFields {

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "audition_form_basic_fields", joinColumns = @JoinColumn(name = "form_id"))
    @Column(name = "field", nullable = false, length = 50)
    @Convert(converter = BasicInformationFieldConverter.class)
    private Set<BasicInformationField> basicFields = new HashSet<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "audition_form_additional_fields", joinColumns = @JoinColumn(name = "form_id"))
    @Column(name = "field", nullable = false, length = 50)
    @Convert(converter = AdditionalInformationFieldConverter.class)
    private Set<AdditionalInformationField> additionalFields = new HashSet<>();

    public ApplicationFields(
            List<BasicInformationField> basicFields,
            List<AdditionalInformationField> additionalFields
    ) {
        replace(basicFields, additionalFields);
    }

    void replace(ApplicationFields changedFields) {
        replace(changedFields.basicFields(), changedFields.additionalFields());
    }

    private void replace(
            List<BasicInformationField> changedBasicFields,
            List<AdditionalInformationField> changedAdditionalFields
    ) {
        validateUnique(changedBasicFields, "기본사항은 중복해서 선택할 수 없습니다.");
        validateUnique(changedAdditionalFields, "추가정보는 중복해서 선택할 수 없습니다.");
        basicFields.clear();
        basicFields.addAll(changedBasicFields);
        additionalFields.clear();
        additionalFields.addAll(changedAdditionalFields);
    }

    private <T> void validateUnique(List<T> fields, String message) {
        requireNonNull(fields, "지원 폼 항목은 필수입니다.");
        if (fields.stream().anyMatch(field -> field == null) || new HashSet<>(fields).size() != fields.size()) {
            throw new BusinessException(INVALID_FORM, message);
        }
    }

    public List<BasicInformationField> basicFields() {
        return orderedValues(BasicInformationField.values(), basicFields);
    }

    public List<AdditionalInformationField> additionalFields() {
        return orderedValues(AdditionalInformationField.values(), additionalFields);
    }

    private <T> List<T> orderedValues(T[] values, Set<T> selectedValues) {
        List<T> orderedValues = new ArrayList<>();
        for (T value : values) {
            if (selectedValues.contains(value)) {
                orderedValues.add(value);
            }
        }
        return List.copyOf(orderedValues);
    }
}
