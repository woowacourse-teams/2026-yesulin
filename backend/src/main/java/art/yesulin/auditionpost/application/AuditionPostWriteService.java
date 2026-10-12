package art.yesulin.auditionpost.application;

import static art.yesulin.auditionpost.domain.AuditionPostErrorCode.INVALID_INPUT;
import static art.yesulin.auditionpost.domain.AuditionPostErrorCode.NOT_FOUND;

import art.yesulin.auditionpost.domain.AuditionPost;
import art.yesulin.auditionpost.domain.AuditionPostContent;
import art.yesulin.auditionpost.domain.AuditionPostFile;
import art.yesulin.auditionpost.domain.AuditionPostFileKind;
import art.yesulin.auditionpost.domain.AuditionPostRepository;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
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
 * 운영자가 공고를 직접 쓰거나 고친다. 본문은 편집기 본문 규칙으로 다시 거르고, 사진·첨부는 이 공고에 이미 있는 파일과 이번에
 * 운영자가 올린 파일만 받는다. 이번에 올린 파일은 저장할 때 확정하고, 빠진 파일은 커밋 뒤 저장소에서 지운다.
 * 고칠 때 공개 상태와 출처는 바꾸지 않는다.
 */
@Service
public class AuditionPostWriteService {

    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");
    private static final String TARGET_TYPE = "AUDITION_POST";

    private final AuditionPostRepository repository;
    private final AuditionPostFileStorage fileStorage;
    private final AuditionPostUploadService uploadService;
    private final AdminAuditLogRepository auditLogRepository;
    private final TransactionTemplate transactions;
    private final Clock clock;

    public AuditionPostWriteService(
            AuditionPostRepository repository,
            AuditionPostFileStorage fileStorage,
            AuditionPostUploadService uploadService,
            AdminAuditLogRepository auditLogRepository,
            PlatformTransactionManager transactionManager,
            Clock clock
    ) {
        this.repository = repository;
        this.fileStorage = fileStorage;
        this.uploadService = uploadService;
        this.auditLogRepository = auditLogRepository;
        this.transactions = new TransactionTemplate(transactionManager);
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public AdminAuditionPostDetailResult findForEdit(long postId) {
        AuditionPost post = repository.findById(postId).orElseThrow(this::notFound);
        return AdminAuditionPostDetailResult.from(post, fileStorage::publicUrl);
    }

    /** 원문 없이 공고를 쓴다. 가져온 공고처럼 숨김으로 시작하고, 작성 시각을 목록 정렬 기준인 게시 시각으로 쓴다. */
    public AdminAuditionPostResult write(long adminId, AuditionPostWriteCommand command) {
        return Objects.requireNonNull(transactions.execute(status -> {
            Instant now = clock.instant();
            FileLookup files = new FileLookup(adminId, List.of());
            AuditionPostEditorBody.Result body = AuditionPostEditorBody.toStored(
                    Objects.requireNonNullElse(command.bodyHtml(), ""), files::image
            );
            AuditionPostContent content = content(command, LocalDateTime.ofInstant(now, KOREA), body.bodyHtml());
            List<AuditionPostFile> postFiles = files.withAttachments(body.images(), command.attachmentUrls());
            AuditionPost post = repository.saveAndFlush(
                    AuditionPost.write(content, command.tags(), postFiles, adminId, now)
            );
            audit(adminId, post, AdminAction.AUDITION_POST_WRITTEN, "직접 작성");
            return AdminAuditionPostResult.from(post, LocalDate.ofInstant(now, KOREA));
        }));
    }

    public AdminAuditionPostResult edit(long adminId, long postId, AuditionPostWriteCommand command) {
        Edited edited = Objects.requireNonNull(transactions.execute(status -> {
            AuditionPost post = repository.findById(postId).orElseThrow(this::notFound);
            AuditionPostContent current = post.getContent();
            FileLookup files = new FileLookup(adminId, post.getFiles());
            String bodyHtml = current.getBodyHtml();
            List<AuditionPostFile> images = post.images();
            if (command.bodyHtml() != null) {
                AuditionPostEditorBody.Result body = AuditionPostEditorBody.toStored(command.bodyHtml(), files::image);
                bodyHtml = body.bodyHtml();
                images = body.images();
            }
            Instant now = clock.instant();
            List<AuditionPostFile> removed = post.edit(
                    content(command, current.getSourcePostedAt(), bodyHtml), command.tags(),
                    files.withAttachments(images, command.attachmentUrls()), adminId, now
            );
            audit(adminId, post, AdminAction.AUDITION_POST_EDITED, "내용 수정");
            return new Edited(AdminAuditionPostResult.from(post, LocalDate.ofInstant(now, KOREA)), removed);
        }));
        fileStorage.deleteQuietly(edited.removed().stream().map(AuditionPostFile::getObjectKey).toList());
        return edited.post();
    }

    private static AuditionPostContent content(
            AuditionPostWriteCommand command,
            LocalDateTime postedAt,
            String bodyHtml
    ) {
        return new AuditionPostContent(
                command.category(), command.title(), command.pay(), command.deadlineText(), command.authorName(),
                postedAt, bodyHtml
        );
    }

    private void audit(long adminId, AuditionPost post, AdminAction action, String detail) {
        String target = post.hasOrigin() ? "%s %s".formatted(post.getSource(), post.getExternalId()) : post.getSource();
        auditLogRepository.save(new AdminAuditLog(adminId, action, TARGET_TYPE, post.getId(), target + " " + detail));
    }

    private BusinessException notFound() {
        return new BusinessException(NOT_FOUND, "공고를 찾을 수 없습니다.");
    }

    /**
     * 저장할 때 본문 사진·첨부 주소를 파일로 바꾼다. 이 공고에 이미 있는 파일을 먼저 찾고, 없으면 이 운영자가 이번에 올린 파일을
     * 확정한다. 같은 주소는 한 번만 확정한다.
     */
    private final class FileLookup {

        private final long uploaderId;
        private final Map<String, AuditionPostFile> existing;
        private final Map<String, AuditionPostFile> claimed = new HashMap<>();

        private FileLookup(long uploaderId, List<AuditionPostFile> existing) {
            this.uploaderId = uploaderId;
            this.existing = existing.stream().collect(Collectors.toMap(
                    fileStorage::publicUrl, Function.identity(), (first, second) -> first
            ));
        }

        /** 본문 사진. 이 공고의 사진이 아니면 null이라 본문에서 빠진다. */
        private AuditionPostFile image(String url) {
            return find(url, AuditionPostFileKind.IMAGE);
        }

        /** 사진 뒤에 남길 첨부를 요청 순서대로 붙인다. 이 공고의 첨부가 아니거나 같은 주소가 두 번 오면 거절한다. */
        private List<AuditionPostFile> withAttachments(List<AuditionPostFile> images, List<String> attachmentUrls) {
            if (attachmentUrls == null) {
                throw new BusinessException(INVALID_INPUT, "남길 첨부파일 목록은 필수입니다.");
            }
            if (new HashSet<>(attachmentUrls).size() != attachmentUrls.size()) {
                throw new BusinessException(INVALID_INPUT, "같은 첨부파일을 두 번 넣을 수 없습니다.");
            }
            List<AuditionPostFile> files = new ArrayList<>(images);
            for (String url : attachmentUrls) {
                AuditionPostFile attachment = find(url, AuditionPostFileKind.ATTACHMENT);
                if (attachment == null) {
                    throw new BusinessException(INVALID_INPUT, "이 공고에 없는 첨부파일입니다.");
                }
                files.add(attachment);
            }
            return files;
        }

        private AuditionPostFile find(String url, AuditionPostFileKind kind) {
            AuditionPostFile file = existing.get(url);
            if (file != null) {
                return file.getKind() == kind ? file : null;
            }
            if (!claimed.containsKey(url)) {
                claimed.put(url, uploadService.claim(uploaderId, url, kind).orElse(null));
            }
            return claimed.get(url);
        }
    }

    private record Edited(AdminAuditionPostResult post, List<AuditionPostFile> removed) {
    }
}
