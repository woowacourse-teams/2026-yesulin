package art.yesulin.infrastructure.applicant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "profile_photos")
public class ProfilePhotoJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "applicant_profile_id", nullable = false)
    private Long applicantProfileId;

    @Column(name = "photo_order", nullable = false)
    private int photoOrder;

    @Column(nullable = false, length = 2048)
    private String url;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected ProfilePhotoJpaEntity() {
    }

    private ProfilePhotoJpaEntity(
            Long applicantProfileId, int photoOrder, String url, LocalDateTime createdAt) {
        this.applicantProfileId = applicantProfileId;
        this.photoOrder = photoOrder;
        this.url = url;
        this.createdAt = createdAt;
    }

    public static ProfilePhotoJpaEntity create(
            Long applicantProfileId, int photoOrder, String url, LocalDateTime createdAt) {
        return new ProfilePhotoJpaEntity(applicantProfileId, photoOrder, url, createdAt);
    }

    public String url() {
        return url;
    }
}
