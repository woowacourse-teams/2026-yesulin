package art.yesulin.pdfreview.application;

import static art.yesulin.pdfreview.domain.PdfReviewErrorCode.PDF_REVIEW_NOT_FOUND;

import art.yesulin.global.exception.BusinessException;
import art.yesulin.pdfreview.domain.PdfReviewRepository;
import java.time.Clock;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class PdfReviewProgressService {

    private final PdfReviewRepository reviews;
    private final PdfReviewProgressQuery query;
    private final Clock clock;

    @Transactional(readOnly = true)
    public PdfReviewProgress find(long ownerId, String reviewId) {
        reviews.findByIdAndOwnerId(reviewId, ownerId).orElseThrow(() ->
                new BusinessException(PDF_REVIEW_NOT_FOUND, "PDF 심사를 찾을 수 없습니다."));
        // 기존 업로드 상태 조회와 같은 만료 후 60초 유예를 적용한다. 처리 지연을 실패로 간주하지 않는다.
        return query.find(ownerId, reviewId, clock.instant().minusSeconds(60));
    }
}
