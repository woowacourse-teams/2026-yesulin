package art.yesulin.domain.audition.schedule;

import jakarta.persistence.AttributeOverride;
import jakarta.persistence.AttributeOverrides;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
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

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "name", column = @Column(name = "venue_name", length = 200)),
            @AttributeOverride(name = "roadAddress", column = @Column(name = "venue_road_address", length = 300)),
            @AttributeOverride(name = "detailAddress", column = @Column(name = "venue_detail_address", length = 300)),
            @AttributeOverride(name = "zonecode", column = @Column(name = "venue_zonecode", length = 20)),
            @AttributeOverride(name = "latitude", column = @Column(name = "venue_latitude", precision = 10, scale = 7)),
            @AttributeOverride(
                    name = "longitude",
                    column = @Column(name = "venue_longitude", precision = 10, scale = 7)
            )
    })
    private AuditionVenue venue;

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
        this.venue = plan.venue();
        this.order = order;
    }

    boolean hasId(long stageId) {
        return id != null && id == stageId;
    }
}
