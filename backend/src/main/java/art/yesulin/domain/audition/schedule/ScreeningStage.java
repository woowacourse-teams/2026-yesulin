package art.yesulin.domain.audition.schedule;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "audition_screening_stages")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ScreeningStage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Getter(AccessLevel.NONE)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "schedule_id", nullable = false)
    private AuditionSchedule schedule;

    @Column(nullable = false, length = ScreeningStagePlan.MAX_NAME_LENGTH)
    private String name;

    @Column(name = "screening_date", nullable = false)
    private LocalDate date;

    @Column(nullable = false, length = ScreeningStagePlan.MAX_NOTICE_LENGTH)
    private String notice;

    @Getter(AccessLevel.NONE)
    @Column(name = "stage_order", nullable = false)
    private int order;

    ScreeningStage(AuditionSchedule schedule, ScreeningStagePlan plan, int order) {
        this.schedule = schedule;
        update(plan, order);
    }

    void update(ScreeningStagePlan plan, int order) {
        this.name = plan.name();
        this.date = plan.date();
        this.notice = plan.notice();
        this.order = order;
    }

    boolean hasId(long stageId) {
        return id != null && id == stageId;
    }
}
