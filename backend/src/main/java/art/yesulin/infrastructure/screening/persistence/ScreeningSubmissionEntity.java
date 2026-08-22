package art.yesulin.infrastructure.screening.persistence;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "screening_submission_snapshots", uniqueConstraints = {
        @UniqueConstraint(name = "uk_screening_submission_snapshots_public_id", columnNames = "public_id")
}, indexes = {
        @Index(name = "idx_screening_submission_snapshots_audition_id", columnList = "audition_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class ScreeningSubmissionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "public_id", nullable = false, updatable = false, length = 36)
    private UUID publicId;

    @Column(name = "audition_id", nullable = false, updatable = false)
    private long auditionId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 10)
    private String gender;

    @Column(name = "birth_date", nullable = false)
    private LocalDate birthDate;

    private Integer height;

    private Integer weight;

    @Column(nullable = false, length = 30)
    private String phone;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(nullable = false, length = 255)
    private String school;

    @Column(name = "submitted_at", nullable = false, updatable = false)
    private Instant submittedAt;

    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    @Column(name = "cover_letter", nullable = false)
    private String coverLetter;

    @JdbcTypeCode(SqlTypes.LONGVARCHAR)
    @Column(nullable = false)
    private String motivation;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "screening_submission_roles", joinColumns = @JoinColumn(name = "submission_id"))
    @Column(name = "audition_role_id", nullable = false)
    private List<Long> roleIds = new ArrayList<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "screening_submission_careers", joinColumns = @JoinColumn(name = "submission_id"))
    @OrderColumn(name = "career_order")
    private List<ScreeningSubmissionCareerEntity> career = new ArrayList<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "screening_submission_photos", joinColumns = @JoinColumn(name = "submission_id"))
    @OrderColumn(name = "photo_order")
    private List<ScreeningSubmissionPhotoEntity> photos = new ArrayList<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "screening_submission_videos", joinColumns = @JoinColumn(name = "submission_id"))
    @OrderColumn(name = "video_order")
    private List<ScreeningSubmissionVideoEntity> videos = new ArrayList<>();
}
