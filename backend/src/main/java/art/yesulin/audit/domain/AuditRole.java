package art.yesulin.audit.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "pdf_review_roles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuditRole {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "review_id", nullable = false, updatable = false)
    private Audit review;

    @Column(nullable = false, updatable = false, length = Audit.MAX_ROLE_NAME_LENGTH)
    private String name;

    @Column(nullable = false, updatable = false)
    private int roleOrder;

    public AuditRole(Audit review, String name, int roleOrder) {
        this.id = UUID.randomUUID().toString();
        this.review = review;
        this.name = name;
        this.roleOrder = roleOrder;
    }
}
