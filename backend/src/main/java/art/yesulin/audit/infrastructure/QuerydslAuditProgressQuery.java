package art.yesulin.audit.infrastructure;

import static art.yesulin.pdfextraction.domain.PdfExtractionStatus.COMPLETED;
import static art.yesulin.pdfextraction.domain.PdfExtractionStatus.FAILED;
import static art.yesulin.pdfextraction.domain.PdfExtractionStatus.PARTIAL;
import static art.yesulin.pdfextraction.domain.PdfExtractionStatus.QUEUED;
import static art.yesulin.pdfextraction.domain.PdfExtractionStatus.UPLOADING;

import art.yesulin.audit.application.AuditProgress;
import art.yesulin.audit.application.AuditProgressQuery;
import art.yesulin.pdfextraction.domain.QPdfExtractionJob;
import art.yesulin.pdfextraction.domain.ai.PdfAiStatus;
import art.yesulin.pdfextraction.domain.ai.QPdfAiJob;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.core.types.dsl.NumberExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class QuerydslAuditProgressQuery implements AuditProgressQuery {

    private static final QPdfExtractionJob JOB = QPdfExtractionJob.pdfExtractionJob;
    private static final QPdfAiJob AI_JOB = QPdfAiJob.pdfAiJob;

    private final JPAQueryFactory query;

    @Override
    public AuditProgress find(long ownerId, String reviewId, Instant expiredBefore) {
        BooleanExpression expired = JOB.status.eq(UPLOADING).and(JOB.uploadedAt.isNull())
                .and(JOB.uploadExpiresAt.before(expiredBefore));
        BooleanExpression aiWaiting = AI_JOB.status.in(PdfAiStatus.PENDING, PdfAiStatus.RUNNING).coalesce(false)
                .and(JOB.status.in(COMPLETED, PARTIAL));
        BooleanExpression uploading = JOB.status.eq(UPLOADING).and(expired.not());
        return query.select(Projections.constructor(AuditProgressCounts.class, JOB.id.count(),
                        count(uploading), count(JOB.status.eq(QUEUED).or(aiWaiting)),
                        count(JOB.status.eq(COMPLETED).and(aiWaiting.not())),
                        count(JOB.status.eq(PARTIAL).and(aiWaiting.not())),
                        count(JOB.status.eq(FAILED).or(expired)),
                        count(JOB.status.eq(QUEUED)), count(JOB.status.eq(COMPLETED)), count(JOB.status.eq(PARTIAL)),
                        count(AI_JOB.status.isNull()),
                        count(AI_JOB.status.eq(PdfAiStatus.PENDING)),
                        count(AI_JOB.status.eq(PdfAiStatus.RUNNING)),
                        count(AI_JOB.status.eq(PdfAiStatus.COMPLETED)),
                        count(AI_JOB.status.eq(PdfAiStatus.FAILED)),
                        count(AI_JOB.status.eq(PdfAiStatus.SKIPPED))))
                .from(JOB)
                .leftJoin(AI_JOB).on(AI_JOB.jobId.eq(JOB.id))
                .where(JOB.ownerId.eq(ownerId), JOB.reviewId.eq(reviewId))
                .fetchOne()
                .toProgress();
    }

    private NumberExpression<Long> count(BooleanExpression condition) {
        return new CaseBuilder().when(condition).then(1L).otherwise(0L).sumLong().coalesce(0L);
    }
}
