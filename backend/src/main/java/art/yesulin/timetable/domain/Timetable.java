package art.yesulin.timetable.domain;

import static art.yesulin.global.validation.DomainValidator.requireNonNull;
import static art.yesulin.timetable.domain.TimetableErrorCode.NOT_PUBLISHABLE;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.timetable.domain.converter.TimetableStatusConverter;
import art.yesulin.timetable.domain.event.TimetableCreatedEvent;
import art.yesulin.timetable.domain.setting.TimeSlot;
import art.yesulin.timetable.domain.setting.TimetableSetting;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PostPersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.time.LocalTime;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.DynamicUpdate;
import org.springframework.data.domain.AbstractAggregateRoot;

/**
 * 기획사가 합격 배우의 오디션 시간을 정하는 일정표다. 로그인 없이 관리 링크의 열쇠로만 접근한다.
 * 배우 배정과 정원 검사는 이 행을 잠근 application service가 {@link TimetableBoard}로 한다.
 */
@Entity
@DynamicUpdate
@Table(name = "timetables", uniqueConstraints = {
        @UniqueConstraint(name = "uk_timetables_manage_key", columnNames = "manage_key")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Timetable extends AbstractAggregateRoot<Timetable> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Embedded
    @AttributeOverride(name = "value", column = @Column(name = "manage_key", nullable = false, updatable = false))
    private TimetableKey manageKey;

    @Embedded
    private TimetableProfile profile;

    @Embedded
    private TimetableSetting setting;

    @Convert(converter = TimetableStatusConverter.class)
    @Column(nullable = false, length = 20)
    private TimetableStatus status;

    @Column(name = "published_at")
    private Instant publishedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Timetable(TimetableProfile profile, TimetableSetting setting) {
        this.manageKey = TimetableKey.generate();
        this.status = TimetableStatus.DRAFT;
        updateProfile(profile);
        this.setting = requireNonNull(setting, "시간 칸 설정은 필수입니다.");
    }

    public void updateProfile(TimetableProfile profile) {
        this.profile = requireNonNull(profile, "일정표 안내 정보는 필수입니다.");
    }

    public void updateSetting(TimetableSetting next) {
        setting.extendTo(requireNonNull(next, "시간 칸 설정은 필수입니다."));
    }

    public void publish(Instant now) {
        if (isPublished()) {
            throw new BusinessException(NOT_PUBLISHABLE, "이미 확정한 일정표입니다.");
        }
        this.status = TimetableStatus.PUBLISHED;
        this.publishedAt = requireNonNull(now, "확정 시각은 필수입니다.");
    }

    public boolean isPublished() {
        return status == TimetableStatus.PUBLISHED;
    }

    public List<TimeSlot> slots() {
        return setting.slots();
    }

    public LocalTime endTimeOf(TimeSlot slot) {
        return slot.startTime().plusMinutes(setting.getSlotMinutes());
    }
    
    @PostPersist
    private void registerCreatedEvent() {
        registerEvent(new TimetableCreatedEvent(id));
    }
}
