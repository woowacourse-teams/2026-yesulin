package art.yesulin.auditionpost.application;

import static art.yesulin.auditionpost.domain.AuditionPostStatus.PUBLISHED;

import art.yesulin.auditionpost.domain.AuditionPostErrorCode;
import art.yesulin.auditionpost.domain.AuditionPostRepository;
import art.yesulin.global.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditionPostViewCountService {

    private final AuditionPostRepository repository;
    private final PendingCounts<Long> pending = new PendingCounts<>("audition post views");

    /** 공개 상세를 연 브라우저가 한 번 보낸다. 숨겼거나 없는 공고는 404다. */
    public void record(long postId) {
        if (!repository.existsByIdAndStatus(postId, PUBLISHED)) {
            throw new BusinessException(AuditionPostErrorCode.NOT_FOUND, "공고를 찾을 수 없습니다.");
        }
        pending.increase(postId);
    }

    /** 그사이 공개가 끝난 공고의 조회수는 더하지 않고 버린다. */
    public int flush() {
        return pending.flush((postId, amount) -> repository.addViewCount(postId, amount, PUBLISHED));
    }

    public long pendingCount(long postId) {
        return pending.get(postId);
    }
}
