package art.yesulin.auditionpost.domain;

import static art.yesulin.auditionpost.domain.AuditionPostErrorCode.INVALID_INPUT;

import art.yesulin.global.exception.BusinessException;
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
import java.util.regex.Pattern;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.BatchSize;
import org.hibernate.annotations.DynamicUpdate;

/**
 * 외부 공고 사이트(수집 허락을 받은 OTR)의 공고 한 건을 우리 서비스 공고로 옮긴 게시글. 운영 서버는 새 공고를 알림과
 * 함께 자동으로 가져오고, 운영자는 관리자 화면에서 직접 가져올 수도 있다. 어느 쪽이든 검토 전으로 시작해 운영자가 확인한 뒤
 * 공개하고, 제작사가 내려 달라고 하면 내린다. 같은 출처·번호를 다시 가져오면 새 행을 만들지 않고 내용과 파일을 원문 기준으로 교체한다.
 * 운영자는 가져온 내용을 직접 고칠 수 있고, 고친 공고를 원문으로 다시 가져오면 수정 표시가 지워진다.
 * 원문 없이 운영자가 직접 쓴 공고와 기획사가 올린 공고도 같은 모델로 저장한다. 출처는 {@link #DIRECT_SOURCE}이고 원문
 * 번호·주소가 없다. 기획사가 올린 공고는 이메일 인증을 마친 계정만 올리므로 바로 공개한다. 공고에 연결된 기획사(소유자)는
 * 그 공고를 고칠 수 있고, 운영자는 소유자와 관계없이 모든 공고를 고치거나 내린다.
 * 처음 만든 경로는 {@link AuditionPostCreation}으로 남기며 다시 가져오거나 고쳐도 바뀌지 않는다.
 * 지원 접수용 {@code OtrAudition}, Slack 알림 이력 {@code Notice}와는 별개다. 공개 주소에는 숫자 ID를 그대로 쓴다.
 * 조회수·원문 이동 수는 저장소의 원자적 update로만 늘리므로, 상태 변경·다시 가져오기가 읽은 시점의 수로
 * 덮어쓰지 않도록 바뀐 컬럼만 갱신한다.
 */
@Entity
@DynamicUpdate
@Table(name = "audition_posts", uniqueConstraints = {
        @UniqueConstraint(name = "uk_audition_posts_source_external_id", columnNames = {"source", "external_id"})
}, indexes = {
        @Index(name = "idx_audition_posts_status_posted", columnList = "status, source_posted_at"),
        @Index(name = "idx_audition_posts_owner", columnList = "owner_id, id"),
        @Index(name = "idx_audition_posts_company", columnList = "company_id, id"),
        @Index(name = "idx_audition_posts_source_author", columnList = "source, source_author_id")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuditionPost {

    public static final int MAX_TAGS = 20;
    public static final int MAX_TAG_LENGTH = 50;
    public static final int MAX_IMAGES = 50;
    public static final int MAX_ATTACHMENTS = 20;
    /** 원문 없이 우리 서비스에서 직접 쓴 공고의 출처. */
    public static final String DIRECT_SOURCE = "YESULIN";
    private static final Pattern SOURCE_AUTHOR_ID = Pattern.compile("[0-9A-Za-z_-]{1,30}");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false, length = 20)
    private String source;

    /** 원문 번호. 직접 쓴 공고는 null이다. */
    @Column(name = "external_id", updatable = false, length = 30)
    private String externalId;

    /** 원문 주소. 직접 쓴 공고는 null이다. */
    @Column(name = "source_url", length = 500)
    private String sourceUrl;

    /**
     * 원문 사이트의 작성자 회원 번호. 닉네임과 달리 바뀌지 않아 같은 작성자의 공고를 업체 계정에 자동으로 연결하는 데 쓴다.
     * 직접 쓴 공고, 원문에 번호가 없는 공고, 번호를 읽기 전에 가져온 공고는 null이다.
     */
    @Column(name = "source_author_id", length = 30)
    private String sourceAuthorId;

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

    @Enumerated(EnumType.STRING)
    @Column(name = "created_via", nullable = false, updatable = false, length = 20)
    private AuditionPostCreation createdVia;

    /** 공개 상세 조회 수. 다시 가져와도 유지하며 증가는 저장소의 원자적 update로만 한다. */
    @Column(name = "view_count", nullable = false)
    private long viewCount;

    /** 브라우저가 중복을 제외하고 보낸 오픈채팅방 링크 방문. 원자적 update로만 늘린다. */
    @Column(name = "openchat_visit_count", nullable = false, updatable = false)
    private long openChatVisitCount;

    /** 숨긴 상태에서 상세 주소를 열어 원문으로 보낸 수. 조회수와 따로 세며 다시 가져와도 유지한다. */
    @Column(name = "redirect_count", nullable = false)
    private long redirectCount;

    /**
     * 마지막으로 가져온 운영자. 운영자가 직접 쓴 공고는 쓴 운영자다. 운영 서버가 새 공고를 자동으로 가져왔거나 기획사가
     * 올렸으면 null이다.
     */
    @Column(name = "imported_by")
    private Long importedBy;

    /** 이 공고를 고칠 수 있는 기획사 회원. 기획사가 올렸거나 운영자가 연결한 공고에만 있다. */
    @Column(name = "owner_id")
    private Long ownerId;

    /** 공고를 올린 공연사. 운영자가 연결하며, 공연사를 공개해야 공고 상세에 함께 보인다. */
    @Column(name = "company_id")
    private Long companyId;

    /** 운영자나 소유 기획사가 마지막으로 직접 고친 시각. 원문으로 다시 가져오면 비운다. */
    @Column(name = "edited_at")
    private Instant editedAt;

    /** 마지막으로 직접 고친 회원(운영자 또는 소유 기획사). */
    @Column(name = "edited_by")
    private Long editedBy;

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
        this.status = AuditionPostStatus.PENDING;
        this.createdVia = importedBy == null ? AuditionPostCreation.AUTO_IMPORT : AuditionPostCreation.ADMIN_IMPORT;
        this.createdAt = requireTime(importedAt);
        apply(content, tags, files, importedBy, importedAt);
    }

    private AuditionPost(
            AuditionPostContent content,
            List<String> tags,
            List<AuditionPostFile> files,
            Long writerId,
            Long ownerId,
            AuditionPostStatus status,
            AuditionPostCreation createdVia,
            Instant writtenAt
    ) {
        this.source = DIRECT_SOURCE;
        this.ownerId = ownerId;
        this.status = status;
        this.createdVia = createdVia;
        this.createdAt = requireTime(writtenAt);
        apply(content, tags, files, writerId, writtenAt);
    }

    /** 운영자가 원문 없이 직접 쓴 공고. 가져온 공고처럼 검토 전으로 시작하고 원문으로 다시 가져올 수 없다. */
    public static AuditionPost write(
            AuditionPostContent content,
            List<String> tags,
            List<AuditionPostFile> files,
            long writerId,
            Instant writtenAt
    ) {
        if (writerId <= 0) {
            throw invalid("쓴 운영자가 올바르지 않습니다.");
        }
        return new AuditionPost(
                content, tags, files, writerId, null, AuditionPostStatus.PENDING, AuditionPostCreation.ADMIN_WRITE,
                writtenAt
        );
    }

    /** 기획사가 올린 공고. 올린 기획사가 소유자가 되고 바로 공개한다. */
    public static AuditionPost publishByOwner(
            AuditionPostContent content,
            List<String> tags,
            List<AuditionPostFile> files,
            long ownerId,
            Instant publishedAt
    ) {
        if (ownerId <= 0) {
            throw invalid("올린 기획사가 올바르지 않습니다.");
        }
        return new AuditionPost(
                content, tags, files, null, ownerId, AuditionPostStatus.PUBLISHED, AuditionPostCreation.PRODUCER_WRITE,
                publishedAt
        );
    }

    /**
     * 원문을 다시 읽은 내용으로 교체하고 더 이상 쓰지 않는 파일을 돌려준다. 공개 상태와 공개 ID는 유지하고,
     * 운영자가 고친 내용은 원문으로 돌아가므로 수정 표시를 지운다.
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
        if (!hasOrigin()) {
            throw invalid("원문이 없는 공고는 다시 가져올 수 없습니다.");
        }
        final List<AuditionPostFile> previous = List.copyOf(this.files);
        apply(content, tags, files, importedBy, refreshedAt);
        this.editedAt = null;
        this.editedBy = null;
        return previous;
    }

    /**
     * 운영자나 소유 기획사가 고친 내용으로 바꾸고 이번 수정으로 빠진 파일을 돌려준다. 출처·공개 상태·가져온 운영자·소유자는
     * 그대로 둔다.
     *
     * @return 고치기 전에 있었지만 이제 쓰지 않는 파일. 호출자가 커밋 뒤 저장소에서 지운다.
     */
    public List<AuditionPostFile> edit(
            AuditionPostContent content,
            List<String> tags,
            List<AuditionPostFile> files,
            long editorId,
            Instant editedAt
    ) {
        if (content == null) {
            throw invalid("공고 내용은 필수입니다.");
        }
        if (editorId <= 0) {
            throw invalid("수정한 회원이 올바르지 않습니다.");
        }
        if (editedAt == null) {
            throw invalid("수정 시각은 필수입니다.");
        }
        final List<AuditionPostFile> previous = List.copyOf(this.files);
        final List<AuditionPostFile> next = validateFiles(files);
        this.content = content;
        this.tags.clear();
        this.tags.addAll(normalizeTags(tags));
        this.files.clear();
        this.files.addAll(next);
        this.editedAt = editedAt;
        this.editedBy = editorId;
        this.updatedAt = editedAt;
        return previous.stream().filter(file -> !next.contains(file)).toList();
    }

    public boolean isEdited() {
        return editedAt != null;
    }

    /** 원문에서 읽은 작성자 회원 번호를 남긴다. 원문에 번호가 없으면 이전 값을 지우지 않는다. */
    public void recordSourceAuthor(String authorId) {
        if (authorId == null) {
            return;
        }
        if (!hasOrigin()) {
            throw invalid("원문이 없는 공고에는 원문 작성자가 없습니다.");
        }
        if (!SOURCE_AUTHOR_ID.matcher(authorId).matches()) {
            throw invalid("원문 작성자 번호가 올바르지 않습니다.");
        }
        this.sourceAuthorId = authorId;
    }

    /** 운영자가 공고를 기획사 계정에 연결하거나 연결을 끊는다. null이면 운영자만 고칠 수 있다. */
    public void changeOwner(Long ownerId) {
        if (ownerId != null && ownerId <= 0) {
            throw invalid("연결할 기획사가 올바르지 않습니다.");
        }
        this.ownerId = ownerId;
    }

    /** 운영자가 공고를 공연사에 연결하거나 연결을 끊는다. */
    public void changeCompany(Long companyId) {
        if (companyId != null && companyId <= 0) {
            throw invalid("연결할 공연사가 올바르지 않습니다.");
        }
        this.companyId = companyId;
    }

    public boolean isOwnedBy(long memberId) {
        return ownerId != null && ownerId == memberId;
    }

    /** 공개하거나 내린다. 공개 여부를 정한 공고를 검토 전으로 되돌리지는 않는다. */
    public void changeStatus(AuditionPostStatus status) {
        if (status == null) {
            throw invalid("공개 상태는 필수입니다.");
        }
        if (status == AuditionPostStatus.PENDING && this.status != AuditionPostStatus.PENDING) {
            throw invalid("공개하거나 내린 공고는 검토 전으로 되돌릴 수 없습니다.");
        }
        this.status = status;
    }

    /** 원문에서 가져온 공고인지. 직접 쓴 공고는 원문 번호·주소가 없다. */
    public boolean hasOrigin() {
        return externalId != null;
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
