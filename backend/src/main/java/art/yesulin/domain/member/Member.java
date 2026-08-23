package art.yesulin.domain.member;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;

import art.yesulin.domain.member.converter.MemberStatusConverter;
import art.yesulin.domain.member.converter.MemberTypeConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "members")
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", nullable = false, length = 320)
    private String email;

    @Column(name = "password_hash", length = 60)
    private String password;

    @Convert(converter = MemberTypeConverter.class)
    @Column(name = "type", nullable = false, length = 20)
    private MemberType type;

    @Convert(converter = MemberStatusConverter.class)
    @Column(name = "status", nullable = false, length = 20)
    private MemberStatus status;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Member(String email, String password, MemberType type, MemberStatus status) {
        this.email = requireText(email, "이메일이 필요합니다.");
        this.password = password;
        this.type = requireNonNull(type, "회원 유형이 필요합니다.");
        this.status = requireNonNull(status, "회원 상태가 필요합니다.");
    }

    /**
     * 배우는 첫 소셜 인증에서 바로 활성 계정으로 만든다.
     */
    public static Member ofApplicant(String email) {
        return new Member(email, null, MemberType.APPLICANT, MemberStatus.ACTIVE);
    }

    /**
     * 기획사·제작사는 가입 직후 운영진 확인을 기다리는 상태로 만든다.
     */
    public static Member ofPendingProducer(String email, String password) {
        return new Member(email, password, MemberType.PRODUCER, MemberStatus.PENDING);
    }

    public void activate() {
        this.status = MemberStatus.ACTIVE;
    }

    public boolean hasPassword() {
        return password != null;
    }
}
