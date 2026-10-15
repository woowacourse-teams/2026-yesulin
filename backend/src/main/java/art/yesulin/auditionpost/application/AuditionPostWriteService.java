package art.yesulin.auditionpost.application;

import static art.yesulin.auditionpost.domain.AuditionPostErrorCode.INVALID_INPUT;
import static art.yesulin.auditionpost.domain.AuditionPostErrorCode.NOT_FOUND;

import art.yesulin.auditionpost.domain.AuditionPost;
import art.yesulin.auditionpost.domain.AuditionPostContent;
import art.yesulin.auditionpost.domain.AuditionPostFile;
import art.yesulin.auditionpost.domain.AuditionPostFileKind;
import art.yesulin.auditionpost.domain.AuditionPostRepository;
import art.yesulin.auditionpost.domain.authorlink.AuditionPostAuthorLinkRepository;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.producer.domain.Producer;
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
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * 운영자와 기획사가 공고를 직접 쓰거나 고친다. 본문은 편집기 본문 규칙으로 다시 거르고, 사진·첨부는 이 공고에 이미 있는
 * 파일과 이번에 저장하는 사람이 올린 파일만 받는다. 이번에 올린 파일은 저장할 때 확정하고, 빠진 파일은 커밋 뒤 저장소에서
 * 지운다. 고칠 때 공개 상태와 출처는 바꾸지 않는다.
 *
 * <p>기획사는 자기 공고만 다룬다. 올리면 바로 공개하고 작성자는 기획사 이름으로 정하며, 기획사는 작성자를 바꾸지 못한다.
 * 기획사가 올리거나 고치면 커밋 뒤 운영자에게 알린다.
 */
@Service
public class AuditionPostWriteService {

    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");
    private static final String TARGET_TYPE = "AUDITION_POST";
    private static final int OWNER_LIST_LIMIT = 200;

    private final AuditionPostRepository repository;
    private final AuditionPostCountQuery countQuery;
    private final AuditionPostFileStorage fileStorage;
    private final AuditionPostUploadService uploadService;
    private final AdminAuditLogRepository auditLogRepository;
    private final AuditionPostOwners owners;
    private final AuditionPostAuthorLinkRepository authorLinkRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final TransactionTemplate transactions;
    private final Clock clock;

    public AuditionPostWriteService(
            AuditionPostRepository repository,
            AuditionPostCountQuery countQuery,
            AuditionPostFileStorage fileStorage,
            AuditionPostUploadService uploadService,
            AdminAuditLogRepository auditLogRepository,
            AuditionPostOwners owners,
            AuditionPostAuthorLinkRepository authorLinkRepository,
            ApplicationEventPublisher eventPublisher,
            PlatformTransactionManager transactionManager,
            Clock clock
    ) {
        this.repository = repository;
        this.countQuery = countQuery;
        this.fileStorage = fileStorage;
        this.uploadService = uploadService;
        this.auditLogRepository = auditLogRepository;
        this.owners = owners;
        this.authorLinkRepository = authorLinkRepository;
        this.eventPublisher = eventPublisher;
        this.transactions = new TransactionTemplate(transactionManager);
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public AuditionPostEditResult findForEdit(long postId) {
        AuditionPost post = repository.findById(postId).orElseThrow(this::notFound);
        return editResult(post);
    }

    /** 기획사가 올렸거나 운영자가 연결해 준 공고를 최근 순서로. 운영자가 숨긴 공고도 포함한다. */
    @Transactional(readOnly = true)
    public List<ProducerAuditionPostResult> findOwned(long ownerId) {
        LocalDate today = LocalDate.now(clock.withZone(KOREA));
        return repository.findAllByOwnerIdOrderByIdDesc(ownerId, PageRequest.of(0, OWNER_LIST_LIMIT)).stream()
                .map(post -> ProducerAuditionPostResult.from(post, today))
                .toList();
    }

    /** 다른 기획사의 공고는 없는 공고처럼 404다. */
    @Transactional(readOnly = true)
    public AuditionPostEditResult findOwnedForEdit(long ownerId, long postId) {
        AuditionPost post = repository.findById(postId).filter(found -> found.isOwnedBy(ownerId))
                .orElseThrow(this::notFound);
        return editResult(post);
    }

    private AuditionPostEditResult editResult(AuditionPost post) {
        AuditionPostEditResult.AuthorLink authorLink = post.getSourceAuthorId() == null ? null : authorLinkRepository
                .findBySourceAndSourceAuthorId(post.getSource(), post.getSourceAuthorId())
                .map(link -> new AuditionPostEditResult.AuthorLink(
                        link.getId(), link.getOwnerId(), owners.find(link.getOwnerId())
                                .map(Producer::getCompanyName).orElse(null)
                ))
                .orElse(null);
        return AuditionPostEditResult.from(post, fileStorage::publicUrl, owners.nameOf(post), authorLink);
    }

    /** 원문 없이 공고를 쓴다. 가져온 공고처럼 숨김으로 시작하고, 작성 시각을 목록 정렬 기준인 게시 시각으로 쓴다. */
    public AdminAuditionPostResult write(long adminId, AuditionPostWriteCommand command) {
        return Objects.requireNonNull(transactions.execute(status -> {
            Instant now = clock.instant();
            FileLookup files = new FileLookup(adminId, List.of());
            AuditionPostEditorBody.Result body = AuditionPostEditorBody.toStored(
                    Objects.requireNonNullElse(command.bodyHtml(), ""), files::image
            );
            AuditionPostContent content = content(
                    command, command.authorName(), LocalDateTime.ofInstant(now, KOREA), body.bodyHtml()
            );
            List<AuditionPostFile> postFiles = files.withAttachments(body.images(), command.attachmentUrls());
            AuditionPost post = repository.saveAndFlush(
                    AuditionPost.write(content, command.tags(), postFiles, adminId, now)
            );
            audit(adminId, post, AdminAction.AUDITION_POST_WRITTEN, "직접 작성");
            countQuery.invalidateAfterCommit();
            return AdminAuditionPostResult.from(post, LocalDate.ofInstant(now, KOREA), null);
        }));
    }

    /** 기획사가 공고를 올린다. 바로 공개하고, 작성자는 기획사 이름이며, 커밋 뒤 운영자에게 알린다. */
    public ProducerAuditionPostResult publishByOwner(long ownerId, AuditionPostWriteCommand command) {
        return Objects.requireNonNull(transactions.execute(status -> {
            Producer producer = owners.find(ownerId)
                    .orElseThrow(() -> new BusinessException(INVALID_INPUT, "기획사 정보를 찾을 수 없습니다."));
            Instant now = clock.instant();
            FileLookup files = new FileLookup(ownerId, List.of());
            AuditionPostEditorBody.Result body = AuditionPostEditorBody.toStored(
                    Objects.requireNonNullElse(command.bodyHtml(), ""), files::image
            );
            AuditionPostContent content = content(
                    command, producer.getCompanyName(), LocalDateTime.ofInstant(now, KOREA), body.bodyHtml()
            );
            List<AuditionPostFile> postFiles = files.withAttachments(body.images(), command.attachmentUrls());
            AuditionPost post = repository.saveAndFlush(
                    AuditionPost.publishByOwner(content, command.tags(), postFiles, ownerId, now)
            );
            eventPublisher.publishEvent(new ProducerAuditionPostPublishedEvent(
                    post.getId(), producer.getCompanyName(), content.getCategory(), content.getTitle(),
                    content.getPay(), content.getDeadlineText()
            ));
            countQuery.invalidateAfterCommit();
            return ProducerAuditionPostResult.from(post, LocalDate.ofInstant(now, KOREA));
        }));
    }

    public AdminAuditionPostResult edit(long adminId, long postId, AuditionPostWriteCommand command) {
        Edited<AdminAuditionPostResult> edited = Objects.requireNonNull(transactions.execute(status -> {
            AuditionPost post = repository.findByIdForUpdate(postId).orElseThrow(this::notFound);
            Applied applied = applyEdit(post, adminId, command, command.authorName());
            audit(adminId, post, AdminAction.AUDITION_POST_EDITED, "내용 수정");
            return new Edited<>(
                    AdminAuditionPostResult.from(post, applied.today(), owners.nameOf(post)), applied.removed()
            );
        }));
        deleteRemoved(edited);
        return edited.post();
    }

    /**
     * 소유 기획사가 공고를 고친다. 작성자는 그대로 두고, 바뀐 항목이 있으면 커밋 뒤 운영자에게 알린다.
     * 다른 기획사의 공고는 없는 공고처럼 404다.
     */
    public ProducerAuditionPostResult editOwned(long ownerId, long postId, AuditionPostWriteCommand command) {
        Edited<ProducerAuditionPostResult> edited = Objects.requireNonNull(transactions.execute(status -> {
            AuditionPost post = repository.findByIdForUpdate(postId).filter(found -> found.isOwnedBy(ownerId))
                    .orElseThrow(this::notFound);
            Applied applied = applyEdit(post, ownerId, command, post.getContent().getAuthorName());
            if (!applied.changes().isEmpty()) {
                eventPublisher.publishEvent(new ProducerAuditionPostEditedEvent(
                        post.getId(), owners.nameOf(post), post.getContent().getTitle(), applied.changes()
                ));
            }
            return new Edited<>(ProducerAuditionPostResult.from(post, applied.today()), applied.removed());
        }));
        deleteRemoved(edited);
        return edited.post();
    }

    /** 운영자가 공고를 기획사 계정에 연결하거나 연결을 끊는다. 연결된 기획사는 이 공고를 직접 고칠 수 있다. */
    @Transactional
    public AdminAuditionPostResult changeOwner(long adminId, long postId, Long ownerId) {
        // 지금 소유자와 같으면 건너뛰므로, 동시에 바꾼 다른 요청의 결과를 보고 비교하도록 잠근다.
        AuditionPost post = repository.findByIdForUpdate(postId).orElseThrow(this::notFound);
        String ownerName = ownerId == null ? null : owners.find(ownerId).map(Producer::getCompanyName)
                .orElseThrow(() -> new BusinessException(INVALID_INPUT, "기획사 계정을 찾을 수 없습니다."));
        if (!Objects.equals(post.getOwnerId(), ownerId)) {
            post.changeOwner(ownerId);
            audit(adminId, post, AdminAction.AUDITION_POST_OWNER_CHANGED,
                    ownerId == null ? "기획사 연결 해제" : "기획사 회원 %d 연결".formatted(ownerId));
        }
        return AdminAuditionPostResult.from(post, LocalDate.now(clock.withZone(KOREA)), ownerName);
    }

    /** 잠근 공고에 고친 내용을 넣는다. 본문을 보내지 않았으면 본문과 사진은 그대로 둔다. */
    private Applied applyEdit(AuditionPost post, long editorId, AuditionPostWriteCommand command, String authorName) {
        AuditionPostContent current = post.getContent();
        AuditionPostChange.Before before = AuditionPostChange.Before.of(post);
        FileLookup files = new FileLookup(editorId, post.getFiles());
        String bodyHtml = current.getBodyHtml();
        List<AuditionPostFile> images = post.images();
        if (command.bodyHtml() != null) {
            AuditionPostEditorBody.Result body = AuditionPostEditorBody.toStored(command.bodyHtml(), files::image);
            bodyHtml = body.bodyHtml();
            images = body.images();
        }
        Instant now = clock.instant();
        List<AuditionPostFile> removed = post.edit(
                content(command, authorName, current.getSourcePostedAt(), bodyHtml), command.tags(),
                files.withAttachments(images, command.attachmentUrls()), editorId, now
        );
        countQuery.invalidateAfterCommit();
        return new Applied(removed, before.changesTo(post), LocalDate.ofInstant(now, KOREA));
    }

    private void deleteRemoved(Edited<?> edited) {
        fileStorage.deleteQuietly(edited.removed().stream().map(AuditionPostFile::getObjectKey).toList());
    }

    private static AuditionPostContent content(
            AuditionPostWriteCommand command,
            String authorName,
            LocalDateTime postedAt,
            String bodyHtml
    ) {
        return new AuditionPostContent(
                command.category(), command.title(), command.pay(), command.deadlineText(), authorName,
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
     * 저장할 때 본문 사진·첨부 주소를 파일로 바꾼다. 이 공고에 이미 있는 파일을 먼저 찾고, 없으면 저장하는 사람이 이번에 올린
     * 파일을 확정한다. 같은 주소는 한 번만 확정한다.
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

    private record Applied(List<AuditionPostFile> removed, List<AuditionPostChange> changes, LocalDate today) {
    }

    private record Edited<T>(T post, List<AuditionPostFile> removed) {
    }
}
