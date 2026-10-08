package art.yesulin.show.application;

import static art.yesulin.show.domain.ShowErrorCode.NOT_FOUND;

import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.show.domain.Show;
import art.yesulin.show.domain.ShowRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 운영자가 기획사 계정 없이 무료 공연을 직접 등록·관리한다. 이 공연은 네이버 폼 같은 외부 링크로만 예매받으므로
 * 예매자 명단과 회차 정원이 없고, 관객이 예매하기를 눌러 이동한 횟수만 센다. 공연 소유자는 등록한 운영자다.
 * 기획사 공연(외부 링크 없음)은 여기서 찾을 수 없는 것으로 다룬다.
 */
@Service
@RequiredArgsConstructor
public class AdminShowManagementService {

    private static final String TARGET_TYPE = "SHOW";

    private final ShowRepository showRepository;
    private final ShowManagementService showManagementService;
    private final AdminAuditLogRepository adminAuditLogRepository;

    @Transactional
    public ProducerShowResult create(long actorMemberId, SaveShowCommand command, String externalReservationUrl) {
        Show show = command.toShow(actorMemberId);
        show.updateExternalReservationUrl(externalReservationUrl);
        ProducerShowResult result = showManagementService.create(show);
        audit(actorMemberId, AdminAction.SHOW_CREATED, show, "외부 링크 공연 등록");
        return result;
    }

    @Transactional(readOnly = true)
    public ProducerShowResult find(UUID showId) {
        return showManagementService.result(getAdminShow(showId));
    }

    @Transactional
    public ProducerShowResult update(UUID showId, SaveShowCommand command, String externalReservationUrl) {
        Show show = getAdminShow(showId);
        command.applyTo(show);
        show.updateExternalReservationUrl(externalReservationUrl);
        return showManagementService.relinkFiles(show);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void delete(long actorMemberId, UUID showId) {
        Show show = getAdminShow(showId);
        showManagementService.delete(show);
        audit(actorMemberId, AdminAction.SHOW_DELETED, show, "외부 링크 공연 삭제");
    }

    @Transactional
    public ProducerShowResult open(long actorMemberId, UUID showId) {
        Show show = getAdminShow(showId);
        ProducerShowResult result = showManagementService.open(show);
        audit(actorMemberId, AdminAction.SHOW_STATUS_CHANGED, show, "공개");
        return result;
    }

    @Transactional
    public ProducerShowResult close(long actorMemberId, UUID showId) {
        Show show = getAdminShow(showId);
        ProducerShowResult result = showManagementService.close(show);
        audit(actorMemberId, AdminAction.SHOW_STATUS_CHANGED, show, "예매 마감");
        return result;
    }

    @Transactional
    public ProducerShowResult addSession(UUID showId, SaveShowSessionCommand command) {
        return showManagementService.addSession(getAdminShow(showId), command);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ProducerShowResult updateSession(UUID showId, long sessionId, SaveShowSessionCommand command) {
        return showManagementService.updateSession(getAdminShow(showId), sessionId, command);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ProducerShowResult deleteSession(UUID showId, long sessionId) {
        return showManagementService.deleteSession(getAdminShow(showId), sessionId);
    }

    private Show getAdminShow(UUID showId) {
        return showRepository.findByPublicId(showId)
                .filter(Show::usesExternalReservation)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공연을 찾을 수 없습니다."));
    }

    private void audit(long actorMemberId, AdminAction action, Show show, String detail) {
        adminAuditLogRepository.save(new AdminAuditLog(actorMemberId, action, TARGET_TYPE, show.getId(), detail));
    }
}
