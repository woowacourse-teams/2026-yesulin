package art.yesulin.actor.application.page;

import static art.yesulin.actor.domain.page.ActorPageErrorCode.ACTOR_HANDLE_TAKEN;

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
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ActorPageService {

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
        if (pageRepository.existsByHandleAndOwnerMemberIdNot(page.getHandle(), ownerId)) {
            throw handleTaken();
        }
        try {
            pageRepository.saveAndFlush(page);
        } catch (DataIntegrityViolationException exception) {
            throw handleTaken();
        }
        return result(page, state);
    }

    @Transactional
    public ActorPageSettingsResult changeVisibilities(long ownerId, Map<ActorPageField, ActorPageVisibility> changes) {
        ActorPageContentState state = contentSync.lock(ownerId);
        ActorPage page = pageOrNew(state, ownerId);
        page.changeVisibilities(changes);
        pageRepository.saveAndFlush(page);
        contentSync.synchronize(state);
        return result(page, state);
    }

    @Transactional
    public ActorPageSettingsResult publish(long ownerId, boolean agreed, String consentVersion) {
        ActorPageContentState state = contentSync.lock(ownerId);
        ActorPage page = pageOrNew(state, ownerId);
        Instant now = Instant.now(clock);
        boolean published = page.publish(agreed, consentVersion, state.readiness(page, contentSync.today()), now);
        pageRepository.saveAndFlush(page);
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
        pageRepository.saveAndFlush(page);
        return result(page, state);
    }

    @Transactional
    public void recordPublishPrompt(long ownerId) {
        ActorPageContentState state = contentSync.lock(ownerId);
        ActorPage page = pageOrNew(state, ownerId);
        page.recordPublishPrompt(Instant.now(clock));
        pageRepository.saveAndFlush(page);
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

    private BusinessException handleTaken() {
        return new BusinessException(ACTOR_HANDLE_TAKEN, "다른 배우 페이지에서 사용 중인 아이디입니다.");
    }
}
