package art.yesulin.auditionpost.application;

import art.yesulin.auditionpost.application.notice.OtrNoticeLink;
import art.yesulin.auditionpost.domain.AuditionPostErrorCode;
import art.yesulin.auditionpost.domain.AuditionPostRepository;
import art.yesulin.auditionpost.domain.AuditionPostStatus;
import art.yesulin.auditionpost.domain.alertchat.OpenChatVisitQuery;
import art.yesulin.auditionpost.domain.notice.NoticeRepository;
import art.yesulin.global.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OpenChatVisitService {

    private static final int PAGE_SIZE = 20;

    private final AuditionPostRepository posts;
    private final NoticeRepository notices;
    private final OpenChatVisitQuery query;

    @Transactional
    public void recordPost(long postId) {
        if (posts.increaseOpenChatVisitCount(postId, AuditionPostStatus.PUBLISHED) == 0) {
            throw notFound();
        }
    }

    /** 가져오기가 실패한 공고의 OTR 경유 방문은 알림에 세고, 나중에 가져오면 공고 통계에 합산한다. */
    @Transactional
    public void recordOtr(String externalId) {
        if (externalId == null || !externalId.matches("[0-9]{1,30}")) {
            throw new IllegalArgumentException("OTR 공고 번호는 숫자 1~30자여야 합니다.");
        }
        if (notices.increaseOpenChatVisitCount(OtrNoticeLink.SOURCE, externalId) == 0) {
            throw notFound();
        }
    }

    @Transactional(readOnly = true)
    public AdminOpenChatVisitsResult findForAdmin(int page) {
        if (page < 0) {
            throw new IllegalArgumentException("page는 0 이상이어야 합니다.");
        }
        long total = query.countPosts();
        return new AdminOpenChatVisitsResult(query.findPosts(PageRequest.of(page, PAGE_SIZE)).stream()
                .map(AdminOpenChatVisitsResult.Post::from).toList(),
                page, PAGE_SIZE, (int) Math.ceil((double) total / PAGE_SIZE), total);
    }

    private BusinessException notFound() {
        return new BusinessException(AuditionPostErrorCode.NOT_FOUND, "공고를 찾을 수 없습니다.");
    }
}
