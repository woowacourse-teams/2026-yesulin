package art.yesulin.application.auditionpost;

import static art.yesulin.domain.auditionpost.AuditionPostErrorCode.NOT_FOUND;
import static art.yesulin.domain.auditionpost.AuditionPostStatus.PUBLISHED;

import art.yesulin.application.file.storage.ObjectStorage;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.admin.AdminAction;
import art.yesulin.domain.admin.AdminAuditLog;
import art.yesulin.domain.admin.AdminAuditLogRepository;
import art.yesulin.domain.auditionpost.AuditionPost;
import art.yesulin.domain.auditionpost.AuditionPostRepository;
import art.yesulin.domain.auditionpost.AuditionPostStatus;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 가져온 공고의 공개 조회와 운영자 목록·공개 상태 변경. 마감 여부는 한국 날짜로 계산한다. */
@Service
@RequiredArgsConstructor
public class AuditionPostService {

    public static final int MAX_PAGE_SIZE = 48;
    private static final int ADMIN_LIST_LIMIT = 200;
    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");
    private static final String TARGET_TYPE = "AUDITION_POST";

    private final AuditionPostRepository repository;
    private final AdminAuditLogRepository auditLogRepository;
    private final ObjectStorage storage;
    private final Clock clock;

    /** 기본은 모집 중인 공고만, {@code includeClosed}면 마감된 공고도 함께 원문 작성 최신순으로 나눠 준다. */
    @Transactional(readOnly = true)
    public PublicAuditionPostPageResult findPublishedPage(int page, int size, boolean includeClosed) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("page는 0 이상, size는 1~%d여야 합니다.".formatted(MAX_PAGE_SIZE));
        }
        LocalDate today = today();
        PageRequest pageable = PageRequest.of(page, size);
        Page<AuditionPost> result = includeClosed
                ? repository.findAllByStatusOrderByContentSourcePostedAtDescIdDesc(PUBLISHED, pageable)
                : repository.findOpen(PUBLISHED, today, pageable);
        List<PublicAuditionPostSummaryResult> posts = result.stream()
                .map(post -> PublicAuditionPostSummaryResult.from(post, today, KOREA, storage::toPublicUrl))
                .toList();
        return new PublicAuditionPostPageResult(
                posts, page, size, result.getTotalPages(), result.getTotalElements(),
                repository.countOpen(PUBLISHED, today), repository.countByStatus(PUBLISHED)
        );
    }

    /** 숨긴 공고는 없는 공고와 같은 404로 응답한다. */
    @Transactional(readOnly = true)
    public PublicAuditionPostResult findPublishedPost(long postId) {
        AuditionPost post = repository.findById(postId)
                .filter(AuditionPost::isPublished)
                .orElseThrow(this::notFound);
        return PublicAuditionPostResult.from(post, today(), KOREA, storage::toPublicUrl);
    }

    @Transactional(readOnly = true)
    public List<AdminAuditionPostResult> findAllForAdmin() {
        LocalDate today = today();
        return repository.findAllByOrderByIdDesc(PageRequest.of(0, ADMIN_LIST_LIMIT)).stream()
                .map(post -> AdminAuditionPostResult.from(post, today))
                .toList();
    }

    @Transactional
    public AdminAuditionPostResult changeStatus(long adminId, long postId, AuditionPostStatus status) {
        AuditionPost post = repository.findById(postId).orElseThrow(this::notFound);
        AuditionPostStatus previous = post.getStatus();
        post.changeStatus(status);
        if (previous != status) {
            auditLogRepository.save(new AdminAuditLog(
                    adminId, AdminAction.AUDITION_POST_STATUS_CHANGED, TARGET_TYPE, post.getId(),
                    "%s → %s".formatted(previous, status)
            ));
        }
        return AdminAuditionPostResult.from(post, today());
    }

    private LocalDate today() {
        return LocalDate.now(clock.withZone(KOREA));
    }

    private BusinessException notFound() {
        return new BusinessException(NOT_FOUND, "공고를 찾을 수 없습니다.");
    }
}
