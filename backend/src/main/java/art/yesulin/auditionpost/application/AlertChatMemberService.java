package art.yesulin.auditionpost.application;

import art.yesulin.auditionpost.application.AdminAlertChatMembersResult.Entry;
import art.yesulin.auditionpost.domain.alertchat.AlertChatMemberCount;
import art.yesulin.auditionpost.domain.alertchat.AlertChatMemberCountRepository;
import art.yesulin.auditionpost.domain.alertchat.AlertChatMembers;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import java.time.Clock;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 공고 알림 오픈채팅방 인원 기록. 운영자가 지금 인원을 적으면 그 시각부터 올라오는 공고의 공개 조회수 추정치에 쓰고, 이미 올라온
 * 공고는 올린 시각의 인원을 그대로 쓴다.
 */
@Service
@RequiredArgsConstructor
public class AlertChatMemberService {

    private static final int ADMIN_HISTORY_LIMIT = 100;
    private static final String TARGET_TYPE = "ALERT_CHAT_MEMBER_COUNT";

    private final AlertChatMemberCountRepository repository;
    private final AdminAuditLogRepository auditLogRepository;
    private final Clock clock;

    @Transactional(readOnly = true)
    public AlertChatMembers members() {
        return AlertChatMembers.of(repository.findAllByOrderByRecordedAtAscIdAsc());
    }

    @Transactional(readOnly = true)
    public AdminAlertChatMembersResult findForAdmin() {
        List<AlertChatMemberCount> counts = repository.findAllByOrderByRecordedAtAscIdAsc();
        List<Entry> history = counts.reversed().stream()
                .limit(ADMIN_HISTORY_LIMIT)
                .map(count -> new Entry(count.getId(), count.getMemberCount(), count.getRecordedAt()))
                .toList();
        return new AdminAlertChatMembersResult(
                AlertChatMembers.of(counts).current(), AlertChatMembers.INITIAL_MEMBER_COUNT, history
        );
    }

    /** 지금 인원을 적는다. 지금부터 올라오는 공고에만 적용한다. */
    @Transactional
    public AdminAlertChatMembersResult record(long adminId, int memberCount) {
        int previous = members().current();
        AlertChatMemberCount count = repository.save(new AlertChatMemberCount(memberCount, adminId, clock.instant()));
        auditLogRepository.save(new AdminAuditLog(
                adminId, AdminAction.ALERT_CHAT_MEMBERS_RECORDED, TARGET_TYPE, count.getId(),
                "공고 알림 오픈채팅방 인원 %d명 → %d명".formatted(previous, memberCount)
        ));
        return findForAdmin();
    }
}
