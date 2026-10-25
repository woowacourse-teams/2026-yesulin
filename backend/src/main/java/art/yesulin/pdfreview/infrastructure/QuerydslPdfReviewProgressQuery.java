package art.yesulin.pdfreview.infrastructure;

import static art.yesulin.pdfextraction.domain.PdfExtractionStatus.COMPLETED;
import static art.yesulin.pdfextraction.domain.PdfExtractionStatus.FAILED;
import static art.yesulin.pdfextraction.domain.PdfExtractionStatus.PARTIAL;
import static art.yesulin.pdfextraction.domain.PdfExtractionStatus.QUEUED;
import static art.yesulin.pdfextraction.domain.PdfExtractionStatus.UPLOADING;

import art.yesulin.pdfextraction.domain.QPdfExtractionJob;
import art.yesulin.pdfreview.application.PdfReviewProgress;
import art.yesulin.pdfreview.application.PdfReviewProgressQuery;
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
public class QuerydslPdfReviewProgressQuery implements PdfReviewProgressQuery {

    private static final QPdfExtractionJob JOB = QPdfExtractionJob.pdfExtractionJob;

    private final JPAQueryFactory query;

    @Override
    public PdfReviewProgress find(long ownerId, String reviewId, Instant expiredBefore) {
        BooleanExpression expired = JOB.status.eq(UPLOADING).and(JOB.uploadedAt.isNull())
                .and(JOB.uploadExpiresAt.before(expiredBefore));
        return query.select(Projections.constructor(PdfReviewProgress.class, JOB.id.count(),
                        count(JOB.status.eq(UPLOADING).and(expired.not())), count(JOB.status.eq(QUEUED)),
                        count(JOB.status.eq(COMPLETED)), count(JOB.status.eq(PARTIAL)),
                        count(JOB.status.eq(FAILED).or(expired))))
                .from(JOB)
                .where(JOB.ownerId.eq(ownerId), JOB.reviewId.eq(reviewId))
                .fetchOne();
    }

    private NumberExpression<Long> count(BooleanExpression condition) {
        return new CaseBuilder().when(condition).then(1L).otherwise(0L).sumLong().coalesce(0L);
    }
}
