package art.yesulin.actor.application.page;

import static art.yesulin.actor.domain.page.ActorPageErrorCode.ACTOR_HANDLE_TAKEN;
import static art.yesulin.actor.domain.page.ActorPageErrorCode.ACTOR_PAGE_CONFLICT;

import art.yesulin.actor.domain.page.ActorPage;
import art.yesulin.actor.domain.page.ActorPageField;
import art.yesulin.actor.domain.page.ActorPageHandle;
import art.yesulin.actor.domain.page.ActorPageHandleUnavailableReason;
import art.yesulin.actor.domain.page.ActorPagePublishConsent;
import art.yesulin.actor.domain.page.ActorPagePublishConsentRepository;
import art.yesulin.actor.domain.page.ActorPageRepository;
import art.yesulin.actor.domain.page.ActorPageVisibility;
import art.yesulin.global.exception.BusinessException;
import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ActorPageService {

    private static final String HANDLE_CONSTRAINT = "uk_actor_pages_handle";
    private static final String OWNER_CONSTRAINT = "uk_actor_pages_owner_member_id";

    private final ActorPageRepository pageRepository;
    private final ActorPagePublishConsentRepository consentRepository;
    private final ActorPageContentSync contentSync;
    private final Clock clock;

    @Transactional(readOnly = true)
    public ActorPageSettingsResult find(long ownerId) {
        ActorPageContentState state = contentSync.read(ownerId);
        return result(pageOrNew(state, ownerId), state);
    }

    @Transactional(readOnly = true)
    public ActorPageHandleAvailabilityResult handleAvailability(long ownerId, String handle) {
        String normalized = ActorPageHandle.normalize(handle);
        ActorPage page = pageRepository.findByOwnerMemberId(ownerId).orElse(null);
        if (page != null && Objects.equals(page.getHandle(), normalized)) {
            return new ActorPageHandleAvailabilityResult(normalized, true, null);
        }
        ActorPageHandleUnavailableReason reason = unavailableReason(ownerId, normalized, page);
        return new ActorPageHandleAvailabilityResult(normalized, reason == null, reason);
    }

    @Transactional
    public ActorPageSettingsResult changeHandle(long ownerId, String handle) {
        ActorPageContentState state = contentSync.lock(ownerId);
        ActorPage page = pageOrNew(state, ownerId);
        page.changeHandle(new ActorPageHandle(handle));
        save(page);
        return result(page, state);
    }

    @Transactional
    public ActorPageSettingsResult changeVisibilities(long ownerId, Map<ActorPageField, ActorPageVisibility> changes) {
        ActorPageContentState state = contentSync.lock(ownerId);
        ActorPage page = pageOrNew(state, ownerId);
        page.changeVisibilities(changes);
        save(page);
        contentSync.synchronize(state);
        return result(page, state);
    }

    @Transactional
    public ActorPageSettingsResult publish(long ownerId, boolean agreed, String consentVersion) {
        ActorPageContentState state = contentSync.lock(ownerId);
        ActorPage page = pageOrNew(state, ownerId);
        Instant now = Instant.now(clock);
        boolean published = page.publish(agreed, consentVersion, state.readiness(page, contentSync.today()), now);
        save(page);
        if (published) {
            consentRepository.save(new ActorPagePublishConsent(page.getId(), ownerId, consentVersion, now));
        }
        return result(page, state);
    }

    @Transactional
    public ActorPageSettingsResult unpublish(long ownerId) {
        ActorPageContentState state = contentSync.lock(ownerId);
        ActorPage page = pageOrNew(state, ownerId);
        page.unpublish();
        save(page);
        contentSync.synchronize(state);
        return result(page, state);
    }

    @Transactional
    public void recordPublishPrompt(long ownerId) {
        ActorPageContentState state = contentSync.lock(ownerId);
        ActorPage page = pageOrNew(state, ownerId);
        page.recordPublishPrompt(Instant.now(clock));
        save(page);
    }

    private ActorPageHandleUnavailableReason unavailableReason(long ownerId, String handle, ActorPage page) {
        if (page != null && !page.isHandleEditable()) {
            return ActorPageHandleUnavailableReason.LOCKED;
        }
        if (!ActorPageHandle.hasValidFormat(handle)) {
            return ActorPageHandleUnavailableReason.INVALID_FORMAT;
        }
        if (ActorPageHandle.isReserved(handle)) {
            return ActorPageHandleUnavailableReason.RESERVED;
        }
        if (pageRepository.existsByHandleAndOwnerMemberIdNot(handle, ownerId)) {
            return ActorPageHandleUnavailableReason.TAKEN;
        }
        return null;
    }

    private ActorPage pageOrNew(ActorPageContentState state, long ownerId) {
        return state.page() == null ? new ActorPage(ownerId) : state.page();
    }

    private ActorPageSettingsResult result(ActorPage page, ActorPageContentState state) {
        return ActorPageSettingsResult.from(page, state, contentSync.today());
    }

    private void save(ActorPage page) {
        try {
            pageRepository.saveAndFlush(page);
        } catch (DataIntegrityViolationException exception) {
            throw translate(exception);
        }
    }

    /**
     * 다른 회원과 아이디가 겹치면 아이디 제약에, 프로필이 없어 잠글 행이 없는 회원의 첫 쓰기 요청이 동시에 페이지를 만들면
     * 회원당 1개 제약에 걸린다. 앞의 것은 아이디 중복으로, 뒤의 것은 다시 시도하면 되는 충돌로 돌려준다.
     */
    static RuntimeException translate(DataIntegrityViolationException exception) {
        String constraint = violatedConstraint(exception);
        if (constraint.contains(HANDLE_CONSTRAINT)) {
            return handleTaken();
        }
        if (constraint.contains(OWNER_CONSTRAINT)) {
            return new BusinessException(ACTOR_PAGE_CONFLICT, "다른 요청과 동시에 처리되어 저장하지 못했습니다. 다시 시도해 주세요.");
        }
        return exception;
    }

    private static String violatedConstraint(DataIntegrityViolationException exception) {
        Throwable cause = exception;
        while (cause != null) {
            if (cause instanceof ConstraintViolationException violation && violation.getConstraintName() != null) {
                return violation.getConstraintName().toLowerCase(Locale.ROOT);
            }
            cause = cause.getCause();
        }
        return "";
    }

    private static BusinessException handleTaken() {
        return new BusinessException(ACTOR_HANDLE_TAKEN, "다른 배우 페이지에서 사용 중인 아이디입니다.");
    }
}
