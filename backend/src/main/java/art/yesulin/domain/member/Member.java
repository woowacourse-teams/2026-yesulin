package art.yesulin.domain.member;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.member.converter.MemberStatusConverter;
import art.yesulin.domain.member.converter.MemberTypeConverter;
import art.yesulin.domain.member.event.ProducerSignedUpEvent;
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
import org.springframework.data.domain.AbstractAggregateRoot;

@Getter
@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "members")
public class Member extends AbstractAggregateRoot<Member> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", length = 320)
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
        this.email = email;
        this.password = password;
        this.type = requireNonNull(type, "회원 유형이 필요합니다.");
        this.status = requireNonNull(status, "회원 상태가 필요합니다.");
    }

    /**
     * 배우는 소셜 인증만 사용하므로 이메일과 비밀번호 없이 바로 활성 계정으로 만든다.
     */
    public static Member ofApplicant() {
        return new Member(null, null, MemberType.APPLICANT, MemberStatus.ACTIVE);
    }

    /**
     * 운영자 계정은 가입 경로가 없고 서버 설정으로만 만든다.
     */
    public static Member ofAdmin(String email, String password) {
        return new Member(
                requireText(email, "이메일이 필요합니다."),
                requireText(password, "비밀번호가 필요합니다."),
                MemberType.ADMIN,
                MemberStatus.ACTIVE
        );
    }

    public static Member ofProducer(String email, String password) {
        String validEmail = requireText(email, "이메일이 필요합니다.");
        Member member = new Member(validEmail, password, MemberType.PRODUCER, MemberStatus.PENDING);
        member.registerEvent(new ProducerSignedUpEvent(validEmail));
        return member;
    }

    public void activate() {
        if (status == MemberStatus.ACTIVE) {
            return;
        }
        changeStatus(MemberStatus.ACTIVE);
    }

    public void deactivate() {
        changeStatus(MemberStatus.PENDING);
    }

    /**
     * 운영자 계정은 스스로를 잠글 수 없어야 하므로 상태 전환 대상에서 제외한다.
     */
    public void changeStatus(MemberStatus target) {
        requireNonNull(target, "회원 상태가 필요합니다.");
        if (type == MemberType.ADMIN) {
            throw new BusinessException(MemberErrorCode.STATUS_CHANGE_NOT_ALLOWED, "운영자 계정의 상태는 바꿀 수 없습니다.");
        }
        this.status = target;
    }

    public void replacePassword(String encodedPassword) {
        this.password = requireText(encodedPassword, "비밀번호가 필요합니다.");
    }

    public boolean isAdmin() {
        return type == MemberType.ADMIN;
    }

    public boolean hasPassword() {
        return password != null;
    }
}
