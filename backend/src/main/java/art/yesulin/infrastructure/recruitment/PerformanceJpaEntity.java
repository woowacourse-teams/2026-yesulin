package art.yesulin.infrastructure.recruitment;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "performances")
public class PerformanceJpaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_id", unique = true, length = 100)
    private String sourceId;

    @Column(name = "company_id", nullable = false)
    private Long companyId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(length = 200)
    private String venue;

    @Column(name = "poster_url", length = 2048)
    private String posterUrl;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected PerformanceJpaEntity() {
    }

    private PerformanceJpaEntity(
            String sourceId,
            Long companyId,
            String title,
            String venue,
            String posterUrl,
            LocalDateTime now) {
        this.sourceId = sourceId;
        this.companyId = companyId;
        this.title = title;
        this.venue = venue;
        this.posterUrl = posterUrl;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public static PerformanceJpaEntity create(
            String sourceId,
            Long companyId,
            String title,
            String venue,
            String posterUrl,
            LocalDateTime now) {
        return new PerformanceJpaEntity(sourceId, companyId, title, venue, posterUrl, now);
    }

    public Long id() {
        return id;
    }

    public String sourceId() {
        return sourceId;
    }

    public Long companyId() {
        return companyId;
    }

    public String title() {
        return title;
    }

    public String venue() {
        return venue;
    }

    public String posterUrl() {
        return posterUrl;
    }

    public LocalDateTime createdAt() {
        return createdAt;
    }

    public void update(String title, String venue, String posterUrl, LocalDateTime now) {
        this.title = title;
        this.venue = venue;
        this.posterUrl = posterUrl;
        this.updatedAt = now;
    }
}
