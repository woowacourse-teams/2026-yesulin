package art.yesulin.pdfextraction.domain.ai;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "pdf_ai_worker_gate")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PdfAiGate {

    @Id
    private Integer id;
    @Column(nullable = false)
    private Instant nextRequestAt;

    public boolean permits(Instant now) {
        return !now.isBefore(nextRequestAt);
    }

    public void reserve(Instant now, Duration interval) {
        if (!permits(now) || interval.isNegative()) {
            throw new IllegalStateException("PDF AI request interval has not elapsed");
        }
        this.nextRequestAt = now.plus(interval);
    }
}
