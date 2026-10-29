package art.yesulin.audit.domain;

import static art.yesulin.audit.domain.AuditErrorCode.INVALID_PDF_REVIEW;

import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Persistable;

@Entity
@Table(name = "pdf_reviews")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Audit implements Persistable<String> {

    public static final int MAX_TITLE_LENGTH = 120;
    public static final int MAX_ROLES = 50;
    public static final int MAX_ROLE_NAME_LENGTH = 100;

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, updatable = false)
    private long ownerId;

    @Column(nullable = false, updatable = false, length = MAX_TITLE_LENGTH)
    private String title;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "review", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("roleOrder ASC")
    private List<AuditRole> roles = new ArrayList<>();

    @Transient
    @Getter(AccessLevel.NONE)
    private boolean newReview = true;

    public Audit(long ownerId, String title, List<String> roleNames, Instant now) {
        if (ownerId < 1) {
            throw new BusinessException(INVALID_PDF_REVIEW, "심사를 만들 수 없습니다.");
        }
        this.id = UUID.randomUUID().toString();
        this.ownerId = ownerId;
        this.title = AuditText.requireName(title, MAX_TITLE_LENGTH, "심사 제목");
        this.createdAt = Objects.requireNonNull(now);
        List<String> names = normalizeRoleNames(roleNames);
        for (int order = 0; order < names.size(); order++) {
            roles.add(new AuditRole(this, names.get(order), order));
        }
    }

    @Override
    public boolean isNew() {
        return newReview;
    }

    public boolean isOwnedBy(long memberId) {
        return ownerId == memberId;
    }

    @PostLoad
    @PostPersist
    private void markStored() {
        newReview = false;
    }

    private static List<String> normalizeRoleNames(List<String> roleNames) {
        if (roleNames == null || roleNames.size() > MAX_ROLES) {
            throw new BusinessException(INVALID_PDF_REVIEW, "배역은 %d개 이하로 입력해 주세요.", MAX_ROLES);
        }
        Set<String> seen = new HashSet<>();
        List<String> names = new ArrayList<>();
        for (String roleName : roleNames) {
            String name = AuditText.requireName(roleName, MAX_ROLE_NAME_LENGTH, "배역 이름");
            if (!seen.add(name)) {
                throw new BusinessException(INVALID_PDF_REVIEW, "같은 이름의 배역을 중복해서 입력할 수 없습니다.");
            }
            names.add(name);
        }
        return names;
    }
}
