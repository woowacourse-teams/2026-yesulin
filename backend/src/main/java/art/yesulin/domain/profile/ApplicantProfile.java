package art.yesulin.domain.profile;

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
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "applicant_profiles", uniqueConstraints = {
        @UniqueConstraint(name = "uk_applicant_profiles_owner_id", columnNames = "owner_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ApplicantProfile {

    public static final int BASIC_INFORMATION_TOTAL = 8;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", nullable = false, updatable = false)
    private long ownerId;

    @Embedded
    private ProfileBasicInformation basicInformation = ProfileBasicInformation.empty();

    @Embedded
    private ProfileAdditionalInformation additionalInformation = ProfileAdditionalInformation.empty();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public ApplicantProfile(long ownerId) {
        this.ownerId = requirePositive(ownerId, "프로필 소유자 ID는 1 이상이어야 합니다.");
    }

    public void replaceBasicInformation(ProfileBasicInformation basicInformation) {
        this.basicInformation = requireNonNull(basicInformation, "프로필 기본 정보는 필수입니다.");
    }

    public void replaceAdditionalInformation(ProfileAdditionalInformation additionalInformation) {
        this.additionalInformation = requireNonNull(additionalInformation, "프로필 추가 정보는 필수입니다.");
    }

    public int filledBasicInformationCount() {
        return basicInformation.filledCount();
    }
}
