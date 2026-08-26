package art.yesulin.domain.admin;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;

import art.yesulin.domain.admin.converter.AdminActionConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

/**
 * 운영자가 실행한 쓰기 작업의 기록이다. 누가 무엇을 언제 바꿨는지만 남기고 개인정보 원문은 담지 않는다.
 */
@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "admin_audit_logs", indexes = {
        @Index(name = "idx_admin_audit_logs_created_at", columnList = "created_at")
})
public class AdminAuditLog {

    private static final int MAX_DETAIL_LENGTH = 200;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "actor_member_id", nullable = false, updatable = false)
    private long actorMemberId;

    @Convert(converter = AdminActionConverter.class)
    @Column(name = "action", nullable = false, updatable = false, length = 40)
    private AdminAction action;

    @Column(name = "target_type", nullable = false, updatable = false, length = 40)
    private String targetType;

    @Column(name = "target_id", nullable = false, updatable = false)
    private long targetId;

    @Column(name = "detail", nullable = false, updatable = false, length = MAX_DETAIL_LENGTH)
    private String detail;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public AdminAuditLog(long actorMemberId, AdminAction action, String targetType, long targetId, String detail) {
        this.actorMemberId = requirePositive(actorMemberId, "운영자 ID는 1 이상이어야 합니다.");
        this.action = requireNonNull(action, "감사 로그 동작이 필요합니다.");
        this.targetType = requireText(targetType, "감사 로그 대상 유형이 필요합니다.");
        this.targetId = requirePositive(targetId, "감사 로그 대상 ID는 1 이상이어야 합니다.");
        this.detail = truncate(requireText(detail, "감사 로그 설명이 필요합니다."));
    }

    private static String truncate(String value) {
        return value.length() <= MAX_DETAIL_LENGTH ? value : value.substring(0, MAX_DETAIL_LENGTH);
    }
}
