package art.yesulin.auditionpost.application;

import static art.yesulin.auditionpost.domain.AuditionPostErrorCode.INVALID_INPUT;
import static art.yesulin.auditionpost.domain.AuditionPostErrorCode.NOT_FOUND;

import art.yesulin.auditionpost.domain.AuditionPost;
import art.yesulin.auditionpost.domain.AuditionPostContent;
import art.yesulin.auditionpost.domain.AuditionPostFile;
import art.yesulin.auditionpost.domain.AuditionPostRepository;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * 운영자가 공고 내용을 직접 고친다. 본문은 편집기 본문 규칙으로 다시 거르고, 사진·첨부는 이미 저장된 것 중에서 빼기만 한다.
 * 빠진 파일은 커밋 뒤 저장소에서 지운다. 공개 상태와 출처는 바꾸지 않는다.
 */
@Service
public class AuditionPostWriteService {

    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");
    private static final String TARGET_TYPE = "AUDITION_POST";

    private final AuditionPostRepository repository;
    private final AuditionPostFileStorage fileStorage;
    private final AdminAuditLogRepository auditLogRepository;
    private final TransactionTemplate transactions;
    private final Clock clock;

    public AuditionPostWriteService(
            AuditionPostRepository repository,
            AuditionPostFileStorage fileStorage,
            AdminAuditLogRepository auditLogRepository,
            PlatformTransactionManager transactionManager,
            Clock clock
    ) {
        this.repository = repository;
        this.fileStorage = fileStorage;
        this.auditLogRepository = auditLogRepository;
        this.transactions = new TransactionTemplate(transactionManager);
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public AdminAuditionPostDetailResult findForEdit(long postId) {
        AuditionPost post = repository.findById(postId).orElseThrow(this::notFound);
        return AdminAuditionPostDetailResult.from(post, fileStorage::publicUrl);
    }

    public AdminAuditionPostResult edit(long adminId, long postId, AuditionPostEditCommand command) {
        Edited edited = Objects.requireNonNull(transactions.execute(status -> {
            AuditionPost post = repository.findById(postId).orElseThrow(this::notFound);
            AuditionPostContent current = post.getContent();
            String bodyHtml = current.getBodyHtml();
            List<AuditionPostFile> images = post.images();
            if (command.bodyHtml() != null) {
                AuditionPostEditorBody.Result body = AuditionPostEditorBody.toStored(command.bodyHtml(), byUrl(images));
                bodyHtml = body.bodyHtml();
                images = body.images();
            }
            AuditionPostContent content = new AuditionPostContent(
                    command.category(), command.title(), command.pay(), command.deadlineText(), command.authorName(),
                    current.getSourcePostedAt(), bodyHtml
            );
            List<AuditionPostFile> files = new ArrayList<>(images);
            files.addAll(keptAttachments(post, command.attachmentUrls()));
            Instant now = clock.instant();
            List<AuditionPostFile> removed = post.edit(content, command.tags(), files, adminId, now);
            auditLogRepository.save(new AdminAuditLog(
                    adminId, AdminAction.AUDITION_POST_EDITED, TARGET_TYPE, post.getId(),
                    "%s %s 내용 수정".formatted(post.getSource(), post.getExternalId())
            ));
            return new Edited(AdminAuditionPostResult.from(post, LocalDate.ofInstant(now, KOREA)), removed);
        }));
        fileStorage.deleteQuietly(edited.removed().stream().map(AuditionPostFile::getObjectKey).toList());
        return edited.post();
    }

    /** 남길 첨부를 요청 순서대로 고른다. 이 공고에 없는 주소나 같은 주소가 두 번 오면 거절한다. */
    private List<AuditionPostFile> keptAttachments(AuditionPost post, List<String> urls) {
        if (urls == null) {
            throw new BusinessException(INVALID_INPUT, "남길 첨부파일 목록은 필수입니다.");
        }
        if (new HashSet<>(urls).size() != urls.size()) {
            throw new BusinessException(INVALID_INPUT, "같은 첨부파일을 두 번 남길 수 없습니다.");
        }
        Map<String, AuditionPostFile> attachments = byUrl(post.attachments());
        return urls.stream()
                .map(url -> {
                    AuditionPostFile file = attachments.get(url);
                    if (file == null) {
                        throw new BusinessException(INVALID_INPUT, "이 공고에 없는 첨부파일입니다.");
                    }
                    return file;
                })
                .toList();
    }

    private Map<String, AuditionPostFile> byUrl(List<AuditionPostFile> files) {
        return files.stream().collect(Collectors.toMap(
                fileStorage::publicUrl, Function.identity(), (first, second) -> first, LinkedHashMap::new
        ));
    }

    private BusinessException notFound() {
        return new BusinessException(NOT_FOUND, "공고를 찾을 수 없습니다.");
    }

    private record Edited(AdminAuditionPostResult post, List<AuditionPostFile> removed) {
    }
}
