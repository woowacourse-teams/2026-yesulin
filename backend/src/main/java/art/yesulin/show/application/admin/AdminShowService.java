package art.yesulin.show.application.admin;

import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.producer.domain.Producer;
import art.yesulin.producer.domain.ProducerRepository;
import art.yesulin.show.domain.Show;
import art.yesulin.show.domain.ShowErrorCode;
import art.yesulin.show.domain.ShowRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 운영자가 기획사 대신 무료 공연의 관객 표시 정보를 고친다. 계정 이름을 개인 이름으로 적은 기획사처럼
 * 기획사가 바로 고치기 어려운 경우에 쓴다.
 */
@Service
@RequiredArgsConstructor
public class AdminShowService {

    private static final String TARGET_TYPE = "SHOW";

    private final ShowRepository showRepository;
    private final ProducerRepository producerRepository;
    private final AdminAuditLogRepository adminAuditLogRepository;

    /** 주최 이름은 개인 이름일 수 있으므로 감사 기록에는 원문 대신 바뀐 방식만 남긴다. */
    @Transactional
    public AdminShowHostNameResult changeHostName(ChangeShowHostNameCommand command) {
        Show show = showRepository.findByPublicId(command.showId())
                .orElseThrow(() -> new BusinessException(ShowErrorCode.NOT_FOUND, "공연을 찾을 수 없습니다."));
        if (show.usesExternalReservation() && (command.hostName() == null || command.hostName().isBlank())) {
            throw new BusinessException(ShowErrorCode.INVALID_INPUT, "주최 이름은 필수입니다.");
        }
        show.updateHostName(command.hostName());
        adminAuditLogRepository.save(new AdminAuditLog(
                command.actorMemberId(),
                AdminAction.SHOW_HOST_NAME_CHANGED,
                TARGET_TYPE,
                show.getId(),
                show.getHostName().isEmpty() ? "주최 이름을 계정 기획사명으로 되돌림" : "주최 이름 직접 입력"
        ));
        String companyName = producerRepository.findByMemberId(show.getOwnerId())
                .map(Producer::getCompanyName)
                .orElse("");
        return new AdminShowHostNameResult(show.getPublicId(), show.getHostName(), companyName);
    }
}
