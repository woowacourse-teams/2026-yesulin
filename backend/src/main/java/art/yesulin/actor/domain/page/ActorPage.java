package art.yesulin.actor.domain.page;

import static art.yesulin.actor.domain.page.ActorPageErrorCode.ACTOR_HANDLE_LOCKED;
import static art.yesulin.actor.domain.page.ActorPageErrorCode.ACTOR_PAGE_CONSENT_REQUIRED;
import static art.yesulin.actor.domain.page.ActorPageErrorCode.ACTOR_PAGE_LOCKED;
import static art.yesulin.actor.domain.page.ActorPageErrorCode.ACTOR_PAGE_NOT_READY;
import static art.yesulin.global.validation.DomainValidator.requireNonNull;
import static art.yesulin.global.validation.DomainValidator.requirePositive;
import static art.yesulin.global.validation.DomainValidator.requireText;

import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.MapKeyEnumerated;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.EnumMap;
import java.util.Map;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "actor_pages", uniqueConstraints = {
        @UniqueConstraint(name = "uk_actor_pages_owner_member_id", columnNames = "owner_member_id"),
        @UniqueConstraint(name = "uk_actor_pages_public_id", columnNames = "public_id"),
        @UniqueConstraint(name = "uk_actor_pages_handle", columnNames = "handle")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ActorPage {

    public static final String CONSENT_VERSION = "actor-page-publish-v1.0";
    public static final int MAX_LOCK_REASON_LENGTH = 500;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "public_id", nullable = false, updatable = false, length = 36)
    private UUID publicId;

    @Column(name = "owner_member_id", nullable = false, updatable = false)
    private long ownerMemberId;

    @Column(name = "handle", length = 30)
    private String handle;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ActorPageStatus status = ActorPageStatus.PRIVATE;

    @Enumerated(EnumType.STRING)
    @Column(name = "auto_hidden_reason", length = 20)
    private ActorPageAutoHiddenReason autoHiddenReason;

    @Column(name = "locked_at")
    private Instant lockedAt;

    @Column(name = "lock_reason", length = MAX_LOCK_REASON_LENGTH)
    private String lockReason;

    @Column(name = "locked_by")
    private Long lockedBy;

    @Column(name = "unlocked_at")
    private Instant unlockedAt;

    @Column(name = "first_published_at")
    private Instant firstPublishedAt;

    @Column(name = "published_at")
    private Instant publishedAt;

    @Column(name = "last_public_activity_at")
    private Instant lastPublicActivityAt;

    @Column(name = "publish_prompt_shown_at")
    private Instant publishPromptShownAt;

    @Getter(AccessLevel.NONE)
    @ElementCollection
    @CollectionTable(name = "actor_page_field_visibilities", joinColumns = @JoinColumn(name = "actor_page_id"))
    @MapKeyColumn(name = "field", length = 30)
    @MapKeyEnumerated(EnumType.STRING)
    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false, length = 20)
    private Map<ActorPageField, ActorPageVisibility> fieldVisibilities = new EnumMap<>(ActorPageField.class);

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public ActorPage(long ownerMemberId) {
        this.ownerMemberId = requirePositive(ownerMemberId, "배우 페이지 소유자 ID는 1 이상이어야 합니다.");
        this.publicId = UUID.randomUUID();
    }

    public boolean isHandleEditable() {
        return firstPublishedAt == null;
    }

    public void changeHandle(ActorPageHandle handle) {
        if (handle.value().equals(this.handle)) {
            return;
        }
        if (!isHandleEditable()) {
            throw new BusinessException(ACTOR_HANDLE_LOCKED, "처음 공개한 이후에는 아이디를 직접 변경할 수 없습니다.");
        }
        this.handle = handle.value();
    }

    public ActorPageVisibility visibilityOf(ActorPageField field) {
        return fieldVisibilities.getOrDefault(field, ActorPageVisibility.PRIVATE);
    }

    public void changeVisibilities(Map<ActorPageField, ActorPageVisibility> changes) {
        changes.forEach((field, visibility) -> fieldVisibilities.put(
                requireNonNull(field, "공개 항목은 필수입니다."), requireNonNull(visibility, "공개 범위는 필수입니다.")
        ));
    }

    public boolean publish(boolean agreed, String consentVersion, ActorPageReadiness readiness, Instant now) {
        if (!agreed || !CONSENT_VERSION.equals(consentVersion)) {
            throw new BusinessException(ACTOR_PAGE_CONSENT_REQUIRED, "현재 버전의 배우 페이지 공개 동의가 필요합니다.");
        }
        if (isLocked()) {
            throw new BusinessException(ACTOR_PAGE_LOCKED, "운영자가 잠근 배우 페이지는 공개할 수 없습니다.");
        }
        if (!readiness.ready()) {
            throw new BusinessException(ACTOR_PAGE_NOT_READY, readiness.message());
        }
        if (isPublic()) {
            return false;
        }
        status = ActorPageStatus.PUBLIC;
        if (firstPublishedAt == null) {
            firstPublishedAt = now;
        }
        publishedAt = now;
        lastPublicActivityAt = now;
        autoHiddenReason = null;
        return true;
    }

    public void unpublish() {
        status = ActorPageStatus.PRIVATE;
        autoHiddenReason = null;
    }

    public void synchronizeContent(ActorPageReadiness readiness, boolean changed, Instant now) {
        if (!isPublic()) {
            return;
        }
        if (readiness.underAge()) {
            autoHide(ActorPageAutoHiddenReason.UNDER_14);
            return;
        }
        if (!readiness.missing().isEmpty()) {
            autoHide(ActorPageAutoHiddenReason.MISSING_REQUIRED);
            return;
        }
        if (changed) {
            lastPublicActivityAt = now;
        }
    }

    private void autoHide(ActorPageAutoHiddenReason reason) {
        status = ActorPageStatus.PRIVATE;
        autoHiddenReason = reason;
    }

    public void lock(String reason, long adminMemberId, Instant now) {
        String validReason = requireText(reason, "잠금 사유는 필수입니다.");
        if (validReason.length() > MAX_LOCK_REASON_LENGTH) {
            throw new IllegalArgumentException("잠금 사유는 500자를 넘을 수 없습니다.");
        }
        status = ActorPageStatus.PRIVATE;
        lockedAt = requireNonNull(now, "잠금 시각은 필수입니다.");
        lockReason = validReason;
        lockedBy = requirePositive(adminMemberId, "운영자 ID는 1 이상이어야 합니다.");
    }

    public void unlock(Instant now) {
        lockedAt = null;
        lockReason = null;
        lockedBy = null;
        unlockedAt = requireNonNull(now, "잠금 해제 시각은 필수입니다.");
        status = ActorPageStatus.PRIVATE;
    }

    public void recordPublishPrompt(Instant now) {
        if (publishPromptShownAt == null) {
            publishPromptShownAt = now;
        }
    }

    public boolean isLocked() {
        return lockedAt != null;
    }

    public boolean isPublic() {
        return status == ActorPageStatus.PUBLIC;
    }
}
