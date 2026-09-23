package art.yesulin.domain.otraudition;

import static art.yesulin.domain.otraudition.OtrAuditionErrorCode.INVALID_INPUT;

import art.yesulin.common.exception.BusinessException;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
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
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "otr_auditions", uniqueConstraints = {
        @UniqueConstraint(name = "uk_otr_auditions_public_id", columnNames = "public_id"),
        @UniqueConstraint(name = "uk_otr_auditions_owner_otr_id", columnNames = {"owner_id", "otr_id"})
}, indexes = @Index(name = "idx_otr_auditions_owner_created", columnList = "owner_id, created_at"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OtrAudition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "public_id", nullable = false, updatable = false, length = 36)
    private UUID publicId;

    @Column(name = "owner_id", nullable = false, updatable = false)
    private long ownerId;

    @Column(name = "otr_id", nullable = false, updatable = false, length = 30)
    private String otrId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false)
    private LocalDate deadline;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "otr_audition_roles", joinColumns = @JoinColumn(name = "otr_audition_id"))
    @OrderColumn(name = "role_order")
    @Column(name = "role_name", nullable = false, length = 100)
    private List<String> roles = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public OtrAudition(long ownerId, String otrId, String title, List<String> roles, LocalDate deadline) {
        if (ownerId <= 0) {
            throw invalid("공연사 계정이 올바르지 않습니다.");
        }
        if (otrId == null || !otrId.trim().matches("[0-9]{1,30}")) {
            throw invalid("OTR 공고 번호는 숫자 1~30자로 입력해 주세요.");
        }
        this.publicId = UUID.randomUUID();
        this.ownerId = ownerId;
        this.otrId = otrId.trim();
        this.title = requiredText(title, 200, "공고 제목은 1~200자로 입력해 주세요.");
        if (deadline == null) {
            throw invalid("마감일을 입력해 주세요.");
        }
        this.deadline = deadline;
        if (roles == null || roles.isEmpty() || roles.size() > 20) {
            throw invalid("배역은 1~20개 입력해 주세요.");
        }
        List<String> normalizedRoles = roles.stream()
                .map(role -> requiredText(role, 100, "배역명은 1~100자로 입력해 주세요."))
                .toList();
        if (new HashSet<>(normalizedRoles).size() != normalizedRoles.size()) {
            throw invalid("같은 배역을 중복해서 입력할 수 없습니다.");
        }
        this.roles = new ArrayList<>(normalizedRoles);
    }

    public String getOtrLink() {
        return "https://otr.co.kr/audition/?vid=" + otrId;
    }

    public boolean isOpenOn(LocalDate date) {
        return !date.isAfter(deadline);
    }

    public boolean hasRole(String role) {
        return roles.contains(role);
    }

    private static String requiredText(String value, int maxLength, String message) {
        if (value == null || value.isBlank() || value.trim().length() > maxLength) {
            throw invalid(message);
        }
        return value.trim();
    }

    private static BusinessException invalid(String message) {
        return new BusinessException(INVALID_INPUT, message);
    }
}
