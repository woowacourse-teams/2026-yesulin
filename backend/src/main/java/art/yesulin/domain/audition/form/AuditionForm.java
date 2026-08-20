package art.yesulin.domain.audition.form;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "audition_forms", uniqueConstraints = {
        @UniqueConstraint(name = "uk_audition_forms_audition_id", columnNames = "audition_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuditionForm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "audition_id", nullable = false, updatable = false)
    private long auditionId;

    @Getter(AccessLevel.NONE)
    @Embedded
    private ApplicationFields fields;

    @Getter(AccessLevel.NONE)
    @Embedded
    private PhotoRequirements photoRequirements;

    @Getter(AccessLevel.NONE)
    @Embedded
    private VideoRequirements videoRequirements;

    @Getter(AccessLevel.NONE)
    @Embedded
    private AdditionalQuestions additionalQuestions;

    public AuditionForm(long auditionId, AuditionFormPlan plan) {
        this.auditionId = requirePositive(auditionId, "공고 ID는 1 이상이어야 합니다.");
        requireNonNull(plan, "지원 폼 정보는 필수입니다.");
        this.fields = plan.fields();
        this.photoRequirements = new PhotoRequirements(this, plan.photoRequirements());
        this.videoRequirements = new VideoRequirements(this, plan.videoRequirements());
        this.additionalQuestions = new AdditionalQuestions(this, plan.additionalQuestions());
    }

    public AuditionForm replace(AuditionFormPlan plan) {
        requireNonNull(plan, "지원 폼 정보는 필수입니다.");
        fields.replace(plan.fields());
        photoRequirements.replace(this, plan.photoRequirements());
        videoRequirements.replace(this, plan.videoRequirements());
        additionalQuestions.replace(this, plan.additionalQuestions());
        return this;
    }

    public List<BasicInformationField> getBasicFields() {
        return fields.basicFields();
    }

    public List<AdditionalInformationField> getAdditionalFields() {
        return fields.additionalFields();
    }

    public List<PhotoRequirement> getPhotoRequirements() {
        return photoRequirements.values();
    }

    public List<VideoRequirement> getVideoRequirements() {
        return videoRequirements.values();
    }

    public List<AdditionalQuestion> getAdditionalQuestions() {
        return additionalQuestions.values();
    }
}
