package art.yesulin.application.admin;

import static art.yesulin.domain.timetable.TimetableErrorCode.INVALID_INPUT;
import static art.yesulin.domain.timetable.TimetableErrorCode.MESSAGE_NOT_FOUND;

import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.admin.AdminAction;
import art.yesulin.domain.admin.AdminAuditLog;
import art.yesulin.domain.admin.AdminAuditLogRepository;
import art.yesulin.domain.timetable.Timetable;
import art.yesulin.domain.timetable.TimetableRepository;
import art.yesulin.domain.timetable.message.TimetableMessage;
import art.yesulin.domain.timetable.message.TimetableMessageRepository;
import art.yesulin.domain.timetable.message.TimetableMessageStatus;
import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 일정표 문자 발송 대기열이다. 문자 업체를 연결하기 전까지 운영자가 번호와 본문을 복사해 직접 보낸 뒤 완료로 표시한다.
 * 대기 문자는 오래된 순, 보낸 문자는 최근 보낸 순으로 보여 준다.
 */
@Service
@RequiredArgsConstructor
public class AdminTimetableMessageService {

    public static final int MAX_COMPLETION_SIZE = 100;
    static final int PENDING_PAGE_SIZE = 200;
    static final int SENT_PAGE_SIZE = 100;
    private static final String TARGET_TYPE = "TIMETABLE_MESSAGE";

    private final TimetableMessageRepository messageRepository;
    private final TimetableRepository timetableRepository;
    private final AdminAuditLogRepository adminAuditLogRepository;
    private final Clock clock;

    @Transactional(readOnly = true)
    public AdminTimetableMessagesResult find(TimetableMessageStatus status) {
        List<TimetableMessage> messages = status == TimetableMessageStatus.PENDING
                ? messageRepository.findAllByStatusOrderByCreatedAtAscIdAsc(
                        status, PageRequest.of(0, PENDING_PAGE_SIZE))
                : messageRepository.findAllByStatusOrderBySentAtDescIdDesc(status, PageRequest.of(0, SENT_PAGE_SIZE));
        return new AdminTimetableMessagesResult(
                messageRepository.countByStatus(TimetableMessageStatus.PENDING),
                toResults(messages)
        );
    }

    /** 이미 보낸 문자는 처음 기록을 유지하고 감사 기록도 다시 남기지 않는다. 감사 기록에는 번호·본문을 담지 않는다. */
    @Transactional
    public List<AdminTimetableMessageResult> complete(long operatorId, List<Long> messageIds) {
        Set<Long> ids = new LinkedHashSet<>(messageIds);
        if (ids.isEmpty() || ids.size() > MAX_COMPLETION_SIZE) {
            throw new BusinessException(INVALID_INPUT, "발송 완료로 표시할 문자는 1건 이상 %d건 이하여야 합니다.",
                    MAX_COMPLETION_SIZE);
        }
        List<TimetableMessage> messages = messageRepository.findAllById(ids);
        if (messages.size() != ids.size()) {
            throw new BusinessException(MESSAGE_NOT_FOUND, "문자를 찾을 수 없습니다. 목록을 새로 불러와 주세요.");
        }
        Instant now = clock.instant();
        for (TimetableMessage message : messages) {
            if (!message.isPending()) {
                continue;
            }
            message.markSent(operatorId, now);
            adminAuditLogRepository.save(new AdminAuditLog(
                    operatorId, AdminAction.TIMETABLE_MESSAGE_SENT, TARGET_TYPE, message.getId(), "일정표 문자 발송 완료 표시"
            ));
        }
        return toResults(messages.stream().sorted(Comparator.comparing(TimetableMessage::getId)).toList());
    }

    private List<AdminTimetableMessageResult> toResults(List<TimetableMessage> messages) {
        Set<Long> timetableIds = messages.stream().map(TimetableMessage::getTimetableId).collect(Collectors.toSet());
        Map<Long, Timetable> timetables = timetableRepository.findAllById(timetableIds).stream()
                .collect(Collectors.toMap(Timetable::getId, Function.identity()));
        return messages.stream()
                .map(message -> AdminTimetableMessageResult.of(message, timetables.get(message.getTimetableId())))
                .toList();
    }
}
