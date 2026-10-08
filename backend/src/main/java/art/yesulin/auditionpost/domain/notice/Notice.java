package art.yesulin.auditionpost.domain.notice;

import static art.yesulin.global.validation.DomainValidator.requireNonNull;
import static art.yesulin.global.validation.DomainValidator.requireText;

import art.yesulin.auditionpost.domain.notice.converter.NoticeStatusConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "notices", uniqueConstraints = {
        @UniqueConstraint(name = "uk_notices_source_external_id", columnNames = {"source", "external_id"})
}, indexes = @Index(name = "idx_notices_pending", columnList = "source, status, id"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false, length = 30)
    private String source;

    @Column(name = "external_id", nullable = false, updatable = false, length = 100)
    private String externalId;

    @Convert(converter = NoticeStatusConverter.class)
    @Column(nullable = false, length = 20)
    private NoticeStatus status;

    private Notice(String source, String externalId, NoticeStatus status) {
        this.source = requireText(source, "공고 출처가 필요합니다.");
        this.externalId = requireText(externalId, "원문 공고 식별자가 필요합니다.");
        this.status = requireNonNull(status, "알림 상태가 필요합니다.");
    }

    public static Notice pending(String source, String externalId) {
        return new Notice(source, externalId, NoticeStatus.PENDING);
    }

    public void markSent() {
        status = NoticeStatus.SENT;
    }
}
