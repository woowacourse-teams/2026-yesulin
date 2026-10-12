package art.yesulin.auditionpost.domain.authorlink;

import static art.yesulin.auditionpost.domain.AuditionPostErrorCode.INVALID_INPUT;

import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.regex.Pattern;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 원문 사이트의 작성자 한 명을 기획사 계정에 자동으로 연결하는 규칙. 운영자만 만들고 지운다. 이 작성자의 공고를 가져오면
 * 아직 기획사가 없는 공고는 이 기획사에 연결된다. 닉네임은 바뀌거나 겹칠 수 있어 원문 회원 번호로 찾고, 닉네임은 화면 표시에만 쓴다.
 */
@Entity
@Table(name = "audition_post_author_links", uniqueConstraints = {
        @UniqueConstraint(
                name = "uk_audition_post_author_links_source_author", columnNames = {"source", "source_author_id"}
        )
}, indexes = @Index(name = "idx_audition_post_author_links_owner", columnList = "owner_id"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuditionPostAuthorLink {

    private static final Pattern SOURCE_AUTHOR_ID = Pattern.compile("[0-9A-Za-z_-]{1,30}");
    private static final int MAX_NAME_LENGTH = 100;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false, length = 20)
    private String source;

    @Column(name = "source_author_id", nullable = false, updatable = false, length = 30)
    private String sourceAuthorId;

    /** 연결할 때의 원문 닉네임. 운영자가 알아보는 데만 쓴다. */
    @Column(name = "source_author_name", nullable = false, updatable = false, length = MAX_NAME_LENGTH)
    private String sourceAuthorName;

    @Column(name = "owner_id", nullable = false, updatable = false)
    private long ownerId;

    @Column(name = "created_by", nullable = false, updatable = false)
    private long createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public AuditionPostAuthorLink(
            String source,
            String sourceAuthorId,
            String sourceAuthorName,
            long ownerId,
            long createdBy,
            Instant createdAt
    ) {
        if (source == null || source.isBlank() || source.length() > 20) {
            throw invalid("원문 출처가 올바르지 않습니다.");
        }
        if (sourceAuthorId == null || !SOURCE_AUTHOR_ID.matcher(sourceAuthorId).matches()) {
            throw invalid("원문 작성자 번호가 올바르지 않습니다.");
        }
        if (ownerId <= 0 || createdBy <= 0 || createdAt == null) {
            throw invalid("연결할 기획사와 연결한 운영자가 올바르지 않습니다.");
        }
        String name = sourceAuthorName == null ? "" : sourceAuthorName.trim();
        this.source = source;
        this.sourceAuthorId = sourceAuthorId;
        this.sourceAuthorName = name.length() > MAX_NAME_LENGTH ? name.substring(0, MAX_NAME_LENGTH) : name;
        this.ownerId = ownerId;
        this.createdBy = createdBy;
        this.createdAt = createdAt;
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(INVALID_INPUT, message);
    }
}
