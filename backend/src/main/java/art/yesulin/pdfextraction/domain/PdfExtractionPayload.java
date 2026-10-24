package art.yesulin.pdfextraction.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "pdf_extraction_payloads")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PdfExtractionPayload {

    @Id
    @Column(name = "job_id", length = 36)
    private String jobId;

    @Column(name = "payload_json", nullable = false, updatable = false, columnDefinition = "mediumtext")
    private String payloadJson;

    @Column(name = "payload_sha256", nullable = false, updatable = false, length = 64)
    private String payloadSha256;

    @Column(name = "received_at", nullable = false, updatable = false)
    private Instant receivedAt;

    public PdfExtractionPayload(String jobId, String payloadJson, String payloadSha256, Instant receivedAt) {
        this.jobId = Objects.requireNonNull(jobId);
        this.payloadJson = Objects.requireNonNull(payloadJson);
        this.payloadSha256 = Objects.requireNonNull(payloadSha256);
        this.receivedAt = Objects.requireNonNull(receivedAt);
    }

    public boolean hasSameDigest(String sha256) {
        return payloadSha256.equals(sha256);
    }
}
