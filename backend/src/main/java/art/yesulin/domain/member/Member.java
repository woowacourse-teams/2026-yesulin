package art.yesulin.domain.member;

import static art.yesulin.domain.common.validation.DomainValidator.requireNonNull;
import static art.yesulin.domain.common.validation.DomainValidator.requireText;

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

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Member(String email, String password, MemberType type) {
        this.email = requireText(email, "이메일이 필요합니다.");
        this.password = password;
        this.type = requireNonNull(type, "회원 유형이 필요합니다.");
    }

    public boolean hasPassword() {
        return password != null;
    }
}
