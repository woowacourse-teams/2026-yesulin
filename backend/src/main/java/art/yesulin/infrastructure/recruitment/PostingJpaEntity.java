package art.yesulin.infrastructure.recruitment;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "postings")
public class PostingJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_id", unique = true, length = 100)
    private String sourceId;

    @Column(name = "performance_id", nullable = false)
    private Long performanceId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "allows_multiple_roles", nullable = false)
    private boolean allowsMultipleRoles;

    @Column(name = "recruitment_starts_at", nullable = false)
    private LocalDateTime recruitmentStartsAt;

    @Column(name = "recruitment_ends_at", nullable = false)
    private LocalDateTime recruitmentEndsAt;

    @Column(name = "application_guide", columnDefinition = "text")
    private String applicationGuide;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected PostingJpaEntity() {
    }

    private PostingJpaEntity(
            String sourceId,
            Long performanceId,
            String title,
            String status,
            boolean allowsMultipleRoles,
            LocalDateTime recruitmentStartsAt,
            LocalDateTime recruitmentEndsAt,
            String applicationGuide,
            LocalDateTime now) {
        this.sourceId = sourceId;
        this.performanceId = performanceId;
        this.title = title;
        this.status = status;
        this.allowsMultipleRoles = allowsMultipleRoles;
        this.recruitmentStartsAt = recruitmentStartsAt;
        this.recruitmentEndsAt = recruitmentEndsAt;
        this.applicationGuide = applicationGuide;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static PostingJpaEntity create(
            String sourceId,
            Long performanceId,
            String title,
            String status,
            boolean allowsMultipleRoles,
            LocalDateTime recruitmentStartsAt,
            LocalDateTime recruitmentEndsAt,
            String applicationGuide,
            LocalDateTime now) {
        return new PostingJpaEntity(
                sourceId, performanceId, title, status, allowsMultipleRoles,
                recruitmentStartsAt, recruitmentEndsAt, applicationGuide, now);
    }

    public boolean acceptsSubmissionAt(LocalDateTime utcNow) {
        return "OPEN".equals(status)
                && !utcNow.isBefore(recruitmentStartsAt)
                && utcNow.isBefore(recruitmentEndsAt);
    }

    public Long id() {
        return id;
    }

    public String sourceId() {
        return sourceId;
    }

    public Long performanceId() {
        return performanceId;
    }

    public String title() {
        return title;
    }

    public boolean allowsMultipleRoles() {
        return allowsMultipleRoles;
    }

    public String status() {
        return status;
    }

    public LocalDateTime recruitmentStartsAt() {
        return recruitmentStartsAt;
    }

    public LocalDateTime recruitmentEndsAt() {
        return recruitmentEndsAt;
    }

    public String applicationGuide() {
        return applicationGuide;
    }

    public void update(
            String title,
            String status,
            boolean allowsMultipleRoles,
            LocalDateTime recruitmentStartsAt,
            LocalDateTime recruitmentEndsAt,
            String applicationGuide,
            LocalDateTime now) {
        this.title = title;
        this.status = status;
        this.allowsMultipleRoles = allowsMultipleRoles;
        this.recruitmentStartsAt = recruitmentStartsAt;
        this.recruitmentEndsAt = recruitmentEndsAt;
        this.applicationGuide = applicationGuide;
        this.updatedAt = now;
    }
}
