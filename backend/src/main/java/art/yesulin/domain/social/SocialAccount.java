package art.yesulin.domain.social;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requirePositive;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;

import art.yesulin.application.auth.social.SocialProvider;
import art.yesulin.domain.social.converter.SocialProviderConverter;
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
 * 소셜 계정과 회원의 연결이다. 회원 식별 고유 키는 (issuer, subject)다.
 */
@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "social_accounts", indexes = {
        @Index(name = "idx_social_accounts_member_id", columnList = "member_id")
})
public class SocialAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id", nullable = false, updatable = false)
    private long memberId;

    @Convert(converter = SocialProviderConverter.class)
    @Column(name = "provider", nullable = false, length = 20)
    private SocialProvider provider;

    @Column(name = "issuer", nullable = false, length = 255, updatable = false)
    private String issuer;

    @Column(name = "subject", nullable = false, length = 255, updatable = false)
    private String subject;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public SocialAccount(long memberId, SocialProvider provider, String issuer, String subject) {
        this.memberId = requirePositive(memberId, "회원 ID는 1 이상이어야 합니다.");
        this.provider = requireNonNull(provider, "소셜 제공자가 필요합니다.");
        this.issuer = requireText(issuer, "issuer가 필요합니다.");
        this.subject = requireText(subject, "subject가 필요합니다.");
    }
}
