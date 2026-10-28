package art.yesulin.actor.application.admin;

import static art.yesulin.actor.domain.page.ActorPageErrorCode.ACTOR_HANDLE_TAKEN;
import static art.yesulin.actor.domain.page.ActorPageErrorCode.ACTOR_PAGE_NOT_FOUND;
import static org.springframework.data.domain.Sort.Order.desc;

import art.yesulin.actor.application.page.ActorPageContentState;
import art.yesulin.actor.application.page.ActorPageContentSync;
import art.yesulin.actor.application.page.ActorPageService;
import art.yesulin.actor.application.page.PublicActorPageResult.Video;
import art.yesulin.actor.application.page.PublicActorPageService;
import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.actor.domain.page.ActorPageHandle;
import art.yesulin.actor.domain.page.ActorPageRepository;
import art.yesulin.actor.domain.profile.ApplicantProfile;
import art.yesulin.actor.domain.profile.ApplicantProfileRepository;
import art.yesulin.actor.domain.profile.ProfileBasicInformation;
import art.yesulin.actor.domain.videolibrary.VideoVisibility;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 운영자의 배우 페이지 관리. 잠금·해제·아이디 변경은 운영자 변경 기록에 남기고, 상세의 연락처 열람은 기록하지 않는다.
 * 변경 기록에는 공개 주소인 아이디만 적고 잠금 사유 원문은 적지 않는다.
 */
@Service
@RequiredArgsConstructor
public class AdminActorPageService {

    static final int MAX_PAGE_SIZE = 100;
    private static final String TARGET_TYPE = "ACTOR_PAGE";

    private final ActorPageRepository pageRepository;
    private final ApplicantProfileRepository profileRepository;
    private final ActorPageContentSync contentSync;
    private final PublicActorPageService publicPages;
    private final AdminAuditLogRepository auditLogRepository;
    private final Clock clock;

    /** 최근에 바뀐 페이지부터 보인다. 아이디 일부를 주면 그 아이디가 들어간 페이지만 찾는다. */
    @Transactional(readOnly = true)
    public AdminActorPagePageResult findPage(String handle, int page, int size) {
        if (page < 0 || size < 1 || size > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("page는 0 이상, size는 1~%d여야 합니다.".formatted(MAX_PAGE_SIZE));
        }
        PageRequest request = PageRequest.of(page, size, Sort.by(desc("updatedAt"), desc("id")));
        String keyword = handle == null ? "" : ActorPageHandle.normalize(handle);
        Page<ActorPage> found = keyword.isEmpty()
                ? pageRepository.findAll(request)
                : pageRepository.findAllByHandleContaining(keyword, request);
        List<Long> ownerIds = found.getContent().stream().map(ActorPage::getOwnerMemberId).toList();
        Map<Long, String> names = ownerIds.isEmpty() ? Map.of() : profileRepository.findAllByOwnerIdIn(ownerIds)
                .stream()
                .filter(profile -> basicOf(profile).name() != null)
                .collect(Collectors.toMap(ApplicantProfile::getOwnerId, profile -> basicOf(profile).name()));
        List<AdminActorPageSummaryResult> rows = found.getContent().stream()
                .map(actorPage -> new AdminActorPageSummaryResult(
                        actorPage.getPublicId(), actorPage.getHandle(), names.get(actorPage.getOwnerMemberId()),
                        actorPage.getStatus(), actorPage.getAutoHiddenReason(), actorPage.isLocked(),
                        actorPage.getLastPublicActivityAt(), actorPage.getUpdatedAt()
                ))
                .toList();
        return new AdminActorPagePageResult(rows, page, size, found.getTotalPages(), found.getTotalElements());
    }

    @Transactional(readOnly = true)
    public AdminActorPageResult find(UUID publicId) {
        return result(contentSync.read(ownerOf(publicId)));
    }

    /** 페이지를 비공개로 내리고 공개 사본을 지운다. 이미 잠겨 있으면 사유만 바꾼다. 잠금 중에도 아이디는 그 배우가 가진다. */
    @Transactional
    public AdminActorPageResult lock(long adminId, UUID publicId, String reason) {
        ActorPageContentState state = contentSync.lock(ownerOf(publicId));
        ActorPage page = state.page();
        page.lock(reason, adminId, Instant.now(clock));
        contentSync.synchronize(state);
        record(adminId, AdminAction.ACTOR_PAGE_LOCKED, page, label(page.getHandle()) + " 잠금");
        return result(state);
    }

    /** 풀어도 비공개로 두고 배우가 내용을 확인한 뒤 직접 다시 공개한다. 잠기지 않은 페이지는 기록 없이 그대로 둔다. */
    @Transactional
    public AdminActorPageResult unlock(long adminId, UUID publicId) {
        ActorPageContentState state = contentSync.lock(ownerOf(publicId));
        ActorPage page = state.page();
        if (page.isLocked()) {
            page.unlock(Instant.now(clock));
            record(adminId, AdminAction.ACTOR_PAGE_UNLOCKED, page, label(page.getHandle()) + " 잠금 해제");
        }
        return result(state);
    }

    /** 옛 아이디는 이동 없이 바로 풀려 옛 주소는 404가 되고, 다른 배우가 곧바로 쓸 수 있다. */
    @Transactional
    public AdminActorPageResult changeHandle(long adminId, UUID publicId, String handle) {
        ActorPageHandle next = new ActorPageHandle(handle);
        ActorPageContentState state = contentSync.lock(ownerOf(publicId));
        ActorPage page = state.page();
        String previous = page.getHandle();
        if (next.value().equals(previous)) {
            return result(state);
        }
        if (pageRepository.existsByHandleAndOwnerMemberIdNot(next.value(), page.getOwnerMemberId())) {
            throw new BusinessException(ACTOR_HANDLE_TAKEN, "다른 배우 페이지에서 사용 중인 아이디입니다.");
        }
        page.changeHandleByAdmin(next);
        try {
            pageRepository.saveAndFlush(page);
        } catch (DataIntegrityViolationException exception) {
            throw ActorPageService.translate(exception);
        }
        record(adminId, AdminAction.ACTOR_PAGE_HANDLE_CHANGED, page,
                "아이디 변경 %s → %s".formatted(label(previous), label(next.value())));
        return result(state);
    }

    private long ownerOf(UUID publicId) {
        return pageRepository.findByPublicId(publicId)
                .map(ActorPage::getOwnerMemberId)
                .orElseThrow(() -> new BusinessException(ACTOR_PAGE_NOT_FOUND, "배우 페이지를 찾을 수 없습니다."));
    }

    private AdminActorPageResult result(ActorPageContentState state) {
        ActorPage page = state.page();
        ProfileBasicInformation basic = basicOf(state.profile());
        List<Video> producerOnlyVideos = state.videos() == null ? List.of() : state.videos().getVideos().stream()
                .filter(video -> video.getVisibility() == VideoVisibility.PRODUCER)
                .map(video -> new Video(video.getUrl(), video.getYoutubeId()))
                .toList();
        return new AdminActorPageResult(
                page.getPublicId(), page.getHandle(), page.getOwnerMemberId(), page.getStatus(),
                page.getAutoHiddenReason(), page.isLocked(), page.getLockReason(), page.getLockedAt(),
                page.getUnlockedAt(), page.getFirstPublishedAt(), page.getPublishedAt(), page.getLastPublicActivityAt(),
                state.readiness(page, contentSync.today()), publicPages.contentOf(state), producerOnlyVideos,
                basic.phone(), basic.email()
        );
    }

    private void record(long adminId, AdminAction action, ActorPage page, String detail) {
        auditLogRepository.save(new AdminAuditLog(adminId, action, TARGET_TYPE, page.getId(), detail));
    }

    private static String label(String handle) {
        return handle == null ? "아이디 없음" : "@" + handle;
    }

    private static ProfileBasicInformation basicOf(ApplicantProfile profile) {
        ProfileBasicInformation basic = profile == null ? null : profile.getBasicInformation();
        return basic == null ? ProfileBasicInformation.empty() : basic;
    }
}
