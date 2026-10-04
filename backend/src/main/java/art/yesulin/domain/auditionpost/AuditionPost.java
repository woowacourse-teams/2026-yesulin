package art.yesulin.domain.auditionpost;

import static art.yesulin.domain.auditionpost.AuditionPostErrorCode.INVALID_INPUT;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
import java.util.LinkedHashSet;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.BatchSize;

/**
 * 외부 공고 사이트(수집 허락을 받은 OTR)의 공고 한 건을 우리 서비스 공고로 옮긴 게시글. 운영 서버는 새 공고를 알림과
 * 함께 자동으로 게시하고, 운영자는 관리자 화면에서 직접 가져올 수도 있다. 게시 뒤 제작사에 허락을 받고 거절하면 숨긴다.
 * 같은 출처·번호를 다시 가져오면 새 행을 만들지 않고 내용과 파일을 원문 기준으로 교체한다.
 * 지원 접수용 {@code OtrAudition}, Slack 알림 이력 {@code Notice}와는 별개다. 공개 주소에는 숫자 ID를 그대로 쓴다.
 */
@Entity
@Table(name = "audition_posts", uniqueConstraints = {
        @UniqueConstraint(name = "uk_audition_posts_source_external_id", columnNames = {"source", "external_id"})
}, indexes = @Index(name = "idx_audition_posts_status_posted", columnList = "status, source_posted_at"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuditionPost {

    public static final int MAX_TAGS = 20;
    public static final int MAX_TAG_LENGTH = 50;
    public static final int MAX_IMAGES = 50;
    public static final int MAX_ATTACHMENTS = 20;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false, length = 20)
    private String source;

    @Column(name = "external_id", nullable = false, updatable = false, length = 30)
    private String externalId;

    @Column(name = "source_url", nullable = false, length = 500)
    private String sourceUrl;

    @Embedded
    private AuditionPostContent content;

    @BatchSize(size = 50)
    @ElementCollection
    @CollectionTable(name = "audition_post_tags", joinColumns = @JoinColumn(name = "audition_post_id"))
    @OrderColumn(name = "tag_order")
    @Column(name = "tag", nullable = false, length = MAX_TAG_LENGTH)
    private List<String> tags = new ArrayList<>();

    @BatchSize(size = 50)
    @ElementCollection
    @CollectionTable(name = "audition_post_files", joinColumns = @JoinColumn(name = "audition_post_id"))
    @OrderColumn(name = "file_order")
    private List<AuditionPostFile> files = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AuditionPostStatus status;

    /** 마지막으로 가져온 운영자. 운영 서버가 새 공고를 자동으로 게시했으면 null이다. */
    @Column(name = "imported_by")
    private Long importedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public AuditionPost(
            AuditionPostOrigin origin,
            AuditionPostContent content,
            List<String> tags,
            List<AuditionPostFile> files,
            Long importedBy,
            Instant importedAt
    ) {
        if (origin == null) {
            throw invalid("공고 출처는 필수입니다.");
        }
        this.source = origin.source();
        this.externalId = origin.externalId();
        this.sourceUrl = origin.sourceUrl();
        this.status = AuditionPostStatus.PUBLISHED;
        this.createdAt = requireTime(importedAt);
        apply(content, tags, files, importedBy, importedAt);
    }

    /**
     * 원문을 다시 읽은 내용으로 교체하고 더 이상 쓰지 않는 파일을 돌려준다. 공개 상태와 공개 ID는 유지한다.
     *
     * @return 교체 전 파일 목록. 호출자가 커밋 뒤 저장소에서 지운다.
     */
    public List<AuditionPostFile> refresh(
            AuditionPostContent content,
            List<String> tags,
            List<AuditionPostFile> files,
            Long importedBy,
            Instant refreshedAt
    ) {
        List<AuditionPostFile> previous = List.copyOf(this.files);
        apply(content, tags, files, importedBy, refreshedAt);
        return previous;
    }

    public void changeStatus(AuditionPostStatus status) {
        if (status == null) {
            throw invalid("공개 상태는 필수입니다.");
        }
        this.status = status;
    }

    public boolean isAutoPublished() {
        return importedBy == null;
    }

    public boolean isPublished() {
        return status == AuditionPostStatus.PUBLISHED;
    }

    public boolean isClosedOn(LocalDate date) {
        return content.isClosedOn(date);
    }

    public List<AuditionPostFile> images() {
        return files.stream().filter(AuditionPostFile::isImage).toList();
    }

    public List<AuditionPostFile> attachments() {
        return files.stream().filter(file -> !file.isImage()).toList();
    }

    private void apply(
            AuditionPostContent content,
            List<String> tags,
            List<AuditionPostFile> files,
            Long importedBy,
            Instant at
    ) {
        if (content == null) {
            throw invalid("공고 내용은 필수입니다.");
        }
        if (importedBy != null && importedBy <= 0) {
            throw invalid("가져온 운영자가 올바르지 않습니다.");
        }
        this.content = content;
        this.tags.clear();
        this.tags.addAll(normalizeTags(tags));
        this.files.clear();
        this.files.addAll(validateFiles(files));
        this.importedBy = importedBy;
        this.updatedAt = requireTime(at);
    }

    private static List<String> normalizeTags(List<String> tags) {
        if (tags == null) {
            return List.of();
        }
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        for (String tag : tags) {
            String trimmed = tag == null ? "" : tag.trim();
            if (!trimmed.isEmpty() && trimmed.length() <= MAX_TAG_LENGTH) {
                normalized.add(trimmed);
            }
        }
        return normalized.stream().limit(MAX_TAGS).toList();
    }

    private static List<AuditionPostFile> validateFiles(List<AuditionPostFile> files) {
        if (files == null) {
            return List.of();
        }
        long images = files.stream().filter(AuditionPostFile::isImage).count();
        if (images > MAX_IMAGES) {
            throw invalid("본문 사진은 %d장까지 가져올 수 있습니다.".formatted(MAX_IMAGES));
        }
        if (files.size() - images > MAX_ATTACHMENTS) {
            throw invalid("첨부파일은 %d개까지 가져올 수 있습니다.".formatted(MAX_ATTACHMENTS));
        }
        return List.copyOf(files);
    }

    private static Instant requireTime(Instant at) {
        if (at == null) {
            throw invalid("가져온 시각은 필수입니다.");
        }
        return at;
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(INVALID_INPUT, message);
    }
}
