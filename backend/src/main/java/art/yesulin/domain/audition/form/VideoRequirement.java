package art.yesulin.domain.audition.form;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "audition_video_requirements")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class VideoRequirement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Getter(AccessLevel.NONE)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "form_id", nullable = false)
    private AuditionForm form;

    @Column(nullable = false, length = VideoRequirementPlan.MAX_DESCRIPTION_LENGTH)
    private String description;

    @Getter(AccessLevel.NONE)
    @Column(name = "requirement_order", nullable = false)
    private int order;

    VideoRequirement(AuditionForm form, VideoRequirementPlan plan, int order) {
        this.form = form;
        update(plan, order);
    }

    void update(VideoRequirementPlan plan, int order) {
        this.description = plan.description();
        this.order = order;
    }

    boolean hasId(long requirementId) {
        return id != null && id == requirementId;
    }
}
