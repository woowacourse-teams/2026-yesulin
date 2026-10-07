package art.yesulin.application.notice;

import art.yesulin.domain.auditionpost.AuditionCategory;
import art.yesulin.domain.notice.Notice;
import art.yesulin.domain.notice.NoticeRepository;
import art.yesulin.domain.notice.NoticeStatus;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditionNoticeService {

    private static final int MAX_PENDING_PER_RUN = 100;
    private static final int MAX_NOTICES_PER_MESSAGE = 5;

    private final AuditionSource auditionSource;
    private final AuditionNoticeNotifier noticeNotifier;
    private final NoticeRepository noticeRepository;
    private final PlatformTransactionManager transactionManager;
    private final AuditionImporter auditionImporter;
    private final OtrNoticeLink noticeLink;

    /** 새 공고를 Slack으로만 알린다. 개발 서버가 운영 자동 가져오기가 안정될 때까지 쓴다. */
    public void notifyAuditions() {
        run(false);
    }

    /** 새 공고를 우리 공고로 숨긴 채 가져온 뒤 Slack으로 알린다. 운영 서버가 쓴다. */
    public void importAndNotifyAuditions() {
        run(true);
    }

    private void run(boolean importPosts) {
        String source = auditionSource.getSource();
        // 연극·퍼포먼스·뮤지컬·단원·기획사 공고만 알린다. 그 밖의 분류는 알림 이력도 만들지 않는다.
        List<AuditionContent> contents = fetchRecent(source).stream()
                .filter(content -> AuditionCategory.supports(content.category()))
                .toList();
        registerNewNotices(contents, source);

        List<AuditionContent> pending = extractPendingNotices(contents, source);
        for (int start = 0; start < pending.size(); start += MAX_NOTICES_PER_MESSAGE) {
            int end = Math.min(start + MAX_NOTICES_PER_MESSAGE, pending.size());
            sendPendingBatch(pending.subList(start, end), source, importPosts);
        }
    }

    private List<AuditionContent> fetchRecent(String source) {
        try {
            return auditionSource.fetchRecent();
        } catch (RuntimeException exception) {
            noticeNotifier.sendError("[%s] 공고 목록 조회 실패: %s".formatted(source, exception.getMessage()));
        }
        return List.of();
    }

    private void registerNewNotices(List<AuditionContent> contents, String source) {
        if (contents.isEmpty()) {
            return;
        }
        new TransactionTemplate(transactionManager).executeWithoutResult(ignored ->
                contents.forEach(content -> {
                    if (!noticeRepository.existsBySourceAndExternalId(source, content.externalId())) {
                        noticeRepository.save(Notice.pending(source, content.externalId()));
                    }
                })
        );
    }

    private List<AuditionContent> extractPendingNotices(List<AuditionContent> contents, String source) {
        List<Notice> pendingSources = noticeRepository.findAllBySourceAndStatusOrderByIdAsc(
                source, NoticeStatus.PENDING, PageRequest.of(0, MAX_PENDING_PER_RUN));
        return pendingSources.stream()
                .map(notice -> resolveContent(notice, contents))
                .flatMap(Optional::stream)
                .toList();
    }

    /**
     * 알림보다 가져오기를 먼저 한다. 가져온 공고면 상태와 관계없이 예술in 상세 링크를 쓴다. 상세는 숨김이면 원문으로,
     * 공개 뒤에는 우리 상세로 열리므로 같은 메시지를 공개 뒤 그대로 공유할 수 있다. 가져오지 못했으면 경유 링크
     * {@code /otr?vid=}로 연결해 이동 수를 세고, 운영자가 나중에 가져와 공개하면 같은 링크가 우리 상세로 열린다.
     * 실패는 알림을 막지 않고 운영자가 직접 가져오도록 따로 알린다.
     */
    private AuditionAlert importAndLink(AuditionContent content, String source) {
        try {
            return auditionImporter.importIfAbsent(source, content.externalId())
                    .map(postId -> new AuditionAlert(content, noticeLink.postLink(postId)))
                    .orElseGet(() -> originalAlert(content));
        } catch (RuntimeException exception) {
            log.warn("공고 자동 가져오기 실패: {}-{}", source, content.externalId());
            try {
                noticeNotifier.sendError("[%s-%s] 자동 가져오기 실패: %s 관리자 화면에서 직접 가져와 주세요.".formatted(
                        source, content.externalId(), exception.getMessage()));
            } catch (RuntimeException alertFailure) {
                log.error("공고 자동 가져오기 실패 알림 전송 실패");
            }
            return originalAlert(content);
        }
    }

    private AuditionAlert originalAlert(AuditionContent content) {
        return new AuditionAlert(content, noticeLink.create(content.externalId()));
    }

    private Optional<AuditionContent> resolveContent(Notice notice, List<AuditionContent> recent) {
        try {
            return Optional.of(recent.stream()
                    .filter(item -> notice.getExternalId().equals(item.externalId()))
                    .findFirst()
                    .orElseGet(() -> auditionSource.fetchById(notice.getExternalId())));
        } catch (RuntimeException exception) {
            noticeNotifier.sendError("[%s-%s] 공고 상세 조회 실패: %s".formatted(
                    notice.getSource(), notice.getExternalId(), exception.getMessage()));
            return Optional.empty();
        }
    }

    private void sendPendingBatch(List<AuditionContent> contents, String source, boolean importPosts) {
        try {
            if (importPosts) {
                noticeNotifier.sendAlerts(contents.stream().map(content -> importAndLink(content, source)).toList());
            } else {
                noticeNotifier.send(contents);
            }
        } catch (RuntimeException exception) {
            log.error("공고 알림 처리 중 예외 발생");
            return;
        }

        if (!contents.isEmpty()) {
            List<String> externalIds = contents.stream().map(AuditionContent::externalId).toList();
            new TransactionTemplate(transactionManager).executeWithoutResult(ignored ->
                    noticeRepository.findAllBySourceAndExternalIdIn(source, externalIds).forEach(Notice::markSent));
        }
    }
}
