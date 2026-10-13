package art.yesulin.auditionpost.application;

import static art.yesulin.auditionpost.domain.AuditionPostErrorCode.NOT_FOUND;
import static art.yesulin.auditionpost.domain.AuditionPostStatus.PUBLISHED;

import art.yesulin.auditionpost.domain.AuditionCategory;
import art.yesulin.auditionpost.domain.AuditionPost;
import art.yesulin.auditionpost.domain.AuditionPostCounts;
import art.yesulin.auditionpost.domain.AuditionPostRepository;
import art.yesulin.auditionpost.domain.AuditionPostStatus;
import art.yesulin.file.application.storage.ObjectStorage;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import java.net.URI;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 공고의 공개 조회와 운영자 목록·공개 상태 변경. 마감 여부는 한국 날짜로 계산한다. */
@Service
@RequiredArgsConstructor
public class AuditionPostService {

    public static final int MAX_PAGE_SIZE = 48;
    private static final int ADMIN_LIST_LIMIT = 200;
    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");
    private static final String TARGET_TYPE = "AUDITION_POST";

    private final AuditionPostRepository repository;
    private final AdminAuditLogRepository auditLogRepository;
    private final AuditionPostOwners owners;
    private final ObjectStorage storage;
    private final Clock clock;

    /** 분야가 있으면 해당 분야만 센다. 기본은 모집 중이며 마감 포함 여부와 관계없이 원문 작성 최신순이다. */
    @Transactional(readOnly = true)
    public PublicAuditionPostPageResult findPublishedPage(int page, int size, boolean includeClosed, String category) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("page는 0 이상, size는 1~%d여야 합니다.".formatted(MAX_PAGE_SIZE));
        }
        if (category != null && !AuditionCategory.supports(category)) {
            throw new IllegalArgumentException("지원하지 않는 공고 분류입니다.");
        }
        String selectedCategory = category == null ? null : category.trim();
        LocalDate today = today();
        PageRequest pageable = PageRequest.of(page, size);
        List<AuditionPost> result = repository.findPublished(
                PUBLISHED, today, includeClosed, selectedCategory, pageable
        );
        Map<Long, String> ownerNames = owners.namesOf(result);
        List<PublicAuditionPostSummaryResult> posts = result.stream()
                .map(post -> PublicAuditionPostSummaryResult.from(
                        post, AuditionPostOwners.authorOf(post, AuditionPostOwners.nameIn(ownerNames, post)),
                        today, KOREA, storage::toPublicUrl
                ))
                .toList();
        AuditionPostCounts counts = repository.countPublishedPosts(PUBLISHED, today, selectedCategory);
        long totalElements = includeClosed ? counts.allCount() : counts.openCount();
        int totalPages = (int) Math.ceil((double) totalElements / size);
        return new PublicAuditionPostPageResult(
                posts, page, size, totalPages, totalElements, counts.openCount(), counts.allCount()
        );
    }

    /**
     * 공개 중이면 상세를, 검토 전이거나 내렸으면 원문 공고 주소를 돌려준다. 원문 없이 쓴 공고는 보낼 곳이 없어 없는 공고처럼 404다.
     */
    @Transactional(readOnly = true)
    public PublicAuditionPostView findPublicPost(long postId) {
        AuditionPost post = repository.findById(postId).orElseThrow(this::notFound);
        if (!post.isPublished()) {
            if (!post.hasOrigin()) {
                throw notFound();
            }
            return new PublicAuditionPostView.Hidden(URI.create(post.getSourceUrl()));
        }
        return new PublicAuditionPostView.Published(PublicAuditionPostResult.from(
                post, AuditionPostOwners.authorOf(post, owners.nameOf(post)), today(), KOREA, storage::toPublicUrl
        ));
    }

    /** 공개 상세를 연 브라우저가 한 번 보낸다. 숨겼거나 없는 공고는 404다. */
    @Transactional
    public void increaseViewCount(long postId) {
        if (repository.increaseViewCount(postId, PUBLISHED) == 0) {
            throw notFound();
        }
    }

    /** 공개하지 않은 공고 상세를 원문으로 보내기 직전에 프론트 서버가 한 번 보낸다. 공개 중이거나 없는 공고는 404다. */
    @Transactional
    public void increaseRedirectCount(long postId) {
        if (repository.increaseRedirectCountUnlessPublished(postId, PUBLISHED) == 0) {
            throw notFound();
        }
    }

    /** 공고 알림 링크가 원문 대신 우리 공고로 보낼 수 있는지 확인한다. 숨긴 공고는 없는 것으로 본다. */
    @Transactional(readOnly = true)
    public Optional<Long> findPublishedId(String source, String externalId) {
        return repository.findBySourceAndExternalId(source, externalId)
                .filter(AuditionPost::isPublished)
                .map(AuditionPost::getId);
    }

    /** 최근 200건. {@code ownerId}가 있으면 그 기획사에 연결된 공고만 최근 200건이다. */
    @Transactional(readOnly = true)
    public List<AdminAuditionPostResult> findAllForAdmin(Long ownerId) {
        LocalDate today = today();
        PageRequest page = PageRequest.of(0, ADMIN_LIST_LIMIT);
        List<AuditionPost> posts = ownerId == null
                ? repository.findAllByOrderByIdDesc(page)
                : repository.findAllByOwnerIdOrderByIdDesc(ownerId, page);
        Map<Long, String> ownerNames = owners.namesOf(posts);
        return posts.stream()
                .map(post -> AdminAuditionPostResult.from(post, today, AuditionPostOwners.nameIn(ownerNames, post)))
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
        return AdminAuditionPostResult.from(post, today(), owners.nameOf(post));
    }

    private LocalDate today() {
        return LocalDate.now(clock.withZone(KOREA));
    }

    private BusinessException notFound() {
        return new BusinessException(NOT_FOUND, "공고를 찾을 수 없습니다.");
    }
}
