package art.yesulin.pdfextraction.domain;

import static art.yesulin.pdfextraction.domain.PdfExtractionErrorCode.INVALID_PDF;

import art.yesulin.global.exception.BusinessException;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "pdf_extraction_jobs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PdfExtractionJob {

    public static final long MAX_FILE_BYTES = PdfFileMetadata.MAX_BYTES;

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, updatable = false)
    private long ownerId;

    @Embedded
    private PdfFileMetadata fileMetadata;

    @Column(length = 1024, updatable = false)
    private String fileKey;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant uploadExpiresAt;

    @Column(length = 64)
    private String sourceSha256;

    private Instant uploadedAt;

    @Column(length = 36, updatable = false)
    private String reviewId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PdfExtractionStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 20)
    private PdfExtractionPurpose purpose;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 20)
    private PdfExtractionOwnerType ownerType;

    /** 처음 결과를 받은 시각. 배우 가져오기는 이 시각부터 24시간 뒤 지운다. */
    private Instant finishedAt;

    /** 배우 가져오기의 하루 1회에 센 작업인지. 실패하거나 제안할 값이 없으면 세지 않는다. */
    @Column(nullable = false)
    private boolean dailyQuotaUsed;

    /** 원본·추출 본문·이미지를 지운 시각. 지운 뒤에는 결과를 돌려주지 않는다. */
    private Instant deletedAt;

    public PdfExtractionJob(long ownerId, String filename, long size, Instant now, Instant expiresAt) {
        this(ownerId, filename, size, now, expiresAt, null);
    }

    public PdfExtractionJob(long ownerId, String filename, long size, Instant now, Instant expiresAt, String reviewId) {
        if (ownerId < 1) {
            throw new BusinessException(INVALID_PDF, "PDF 파일을 올릴 수 없습니다.");
        }
        this.id = UUID.randomUUID().toString();
        this.ownerId = ownerId;
        this.fileMetadata = new PdfFileMetadata(filename, size);
        this.createdAt = Objects.requireNonNull(now);
        this.uploadExpiresAt = Objects.requireNonNull(expiresAt);
        this.reviewId = reviewId == null ? null : UUID.fromString(reviewId).toString();
        this.status = PdfExtractionStatus.UPLOADING;
        this.purpose = PdfExtractionPurpose.PDF_REVIEW;
        this.ownerType = PdfExtractionOwnerType.PRODUCER;
    }

    /** 배우가 자기 PDF 프로필로 편집 화면을 채우는 작업. 공연사 심사와 섞이지 않도록 심사에 묶지 않는다. */
    public static PdfExtractionJob forActorProfile(
            long ownerId, String filename, long size, Instant now, Instant expiresAt
    ) {
        PdfExtractionJob job = new PdfExtractionJob(ownerId, filename, size, now, expiresAt, null);
        job.purpose = PdfExtractionPurpose.ACTOR_PROFILE;
        job.ownerType = PdfExtractionOwnerType.APPLICANT;
        return job;
    }

    public String getOriginalFilename() {
        return fileMetadata.getOriginalFilename();
    }

    public long getSize() {
        return fileMetadata.getSize();
    }

    public void identifySource(String key) {
        if (key == null || key.isBlank() || key.length() > 1024 || (fileKey != null && !fileKey.equals(key))) {
            throw new IllegalArgumentException("PDF source file key cannot change");
        }
        fileKey = key;
    }

    public void identifySourceSha256(String sha256) {
        if (sha256 == null || !sha256.matches("[0-9a-f]{64}")
                || (sourceSha256 != null && !sourceSha256.equals(sha256))) {
            throw new BusinessException(INVALID_PDF, "PDF 파일의 체크섬이 올바르지 않습니다.");
        }
        sourceSha256 = sha256;
    }

    public void renewUploadWindow(Instant expiresAt) {
        if (uploadedAt != null || isFinished() || isDeleted()) {
            throw new IllegalStateException("Only an unconfirmed upload can renew its upload window");
        }
        uploadExpiresAt = Objects.requireNonNull(expiresAt);
    }

    public void confirmUpload(Instant now) {
        if (uploadedAt != null) {
            return;
        }
        uploadedAt = now;
        status = PdfExtractionStatus.QUEUED;
    }

    public void receiveResult(String resultStatus, Instant now) {
        PdfExtractionStatus next = PdfExtractionStatus.valueOf(resultStatus);
        if (!next.isFinal()) {
            throw new IllegalArgumentException("완료된 추출 결과만 반영할 수 있습니다.");
        }
        if (uploadedAt == null) {
            uploadedAt = Objects.requireNonNull(now);
        }
        if (finishedAt == null) {
            finishedAt = now;
        }
        status = next;
    }

    /** 배우 가져오기는 제안할 값이 하나라도 나온 작업만 하루 1회에 센다. 일부만 나와도 센다. */
    public void recordDailyQuotaUse(boolean hasProposal) {
        if (purpose == PdfExtractionPurpose.ACTOR_PROFILE && hasProposal) {
            dailyQuotaUsed = true;
        }
    }

    /** 업로드 주소가 아직 유효하거나 결과를 기다리는 중이다. 업로드 만료는 60초 유예 뒤로 본다. */
    public boolean isInProgress(Instant now) {
        if (status == PdfExtractionStatus.QUEUED) {
            return true;
        }
        return status == PdfExtractionStatus.UPLOADING && !now.isAfter(uploadExpiresAt.plusSeconds(60));
    }

    public void markDeleted(Instant now) {
        if (deletedAt == null) {
            deletedAt = Objects.requireNonNull(now);
        }
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public boolean isActorProfile() {
        return purpose == PdfExtractionPurpose.ACTOR_PROFILE;
    }

    public boolean isFinished() {
        return status.isFinal();
    }
}
