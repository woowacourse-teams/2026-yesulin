package art.yesulin.pdfreview.domain;

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
public class PdfReviewRole {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "review_id", nullable = false, updatable = false)
    private PdfReview review;

    @Column(nullable = false, updatable = false, length = PdfReview.MAX_ROLE_NAME_LENGTH)
    private String name;

    @Column(nullable = false, updatable = false)
    private int roleOrder;

    public PdfReviewRole(PdfReview review, String name, int roleOrder) {
        this.id = UUID.randomUUID().toString();
        this.review = review;
        this.name = name;
        this.roleOrder = roleOrder;
    }
}
