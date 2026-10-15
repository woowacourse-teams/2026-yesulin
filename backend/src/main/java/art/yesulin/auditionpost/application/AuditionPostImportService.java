package art.yesulin.auditionpost.application;

import static art.yesulin.auditionpost.domain.AuditionPostErrorCode.EDITED;
import static art.yesulin.auditionpost.domain.AuditionPostErrorCode.FILE_REJECTED;
import static art.yesulin.auditionpost.domain.AuditionPostErrorCode.IMPORT_CONFLICT;
import static art.yesulin.auditionpost.domain.AuditionPostErrorCode.SOURCE_UNAVAILABLE;

import art.yesulin.auditionpost.application.AuditionPostImportResult.SkippedFile;
import art.yesulin.auditionpost.application.notice.AuditionImporter;
import art.yesulin.auditionpost.domain.AuditionPost;
import art.yesulin.auditionpost.domain.AuditionPostContent;
import art.yesulin.auditionpost.domain.AuditionPostFile;
import art.yesulin.auditionpost.domain.AuditionPostFileKind;
import art.yesulin.auditionpost.domain.AuditionPostOrigin;
import art.yesulin.auditionpost.domain.AuditionPostRepository;
import art.yesulin.auditionpost.domain.authorlink.AuditionPostAuthorLinkRepository;
import art.yesulin.global.audit.AdminAction;
import art.yesulin.global.audit.AdminAuditLog;
import art.yesulin.global.audit.AdminAuditLogRepository;
import art.yesulin.global.exception.BusinessException;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * 원문 공고 한 건을 본문·사진·첨부파일까지 숨김으로 옮긴다. 운영자가 지원서를 준비한 뒤 공개하고, 제작사가 내려 달라고
 * 하면 다시 숨긴다. 원문과 파일을 내려받는 동안에는 DB 트랜잭션을 잡지 않고, 마지막 저장만 짧은 트랜잭션으로 처리한다.
 * 저장에 실패하면 이번에 올린 파일을 지우고, 다시 가져와 교체한 경우에는 커밋 뒤 예전 파일을 지운다.
 * 자동 가져오기가 저장 직전에 이미 있는 번호를 만나면 내용을 바꾸지 않고 이번에 올린 파일을 지운다.
 */
@Slf4j
@Service
public class AuditionPostImportService implements AuditionImporter {

    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");
    private static final String TARGET_TYPE = "AUDITION_POST";

    private final AuditionPostSource source;
    private final AuditionPostFileStorage fileStorage;
    private final AuditionPostRepository repository;
    private final AuditionPostCountQuery countQuery;
    private final AdminAuditLogRepository auditLogRepository;
    private final AuditionPostOwners owners;
    private final AuditionPostAuthorLinkRepository authorLinkRepository;
    private final TransactionTemplate transactions;
    private final Clock clock;

    public AuditionPostImportService(
            AuditionPostSource source,
            AuditionPostFileStorage fileStorage,
            AuditionPostRepository repository,
            AuditionPostCountQuery countQuery,
            AdminAuditLogRepository auditLogRepository,
            AuditionPostOwners owners,
            AuditionPostAuthorLinkRepository authorLinkRepository,
            PlatformTransactionManager transactionManager,
            Clock clock
    ) {
        this.source = source;
        this.fileStorage = fileStorage;
        this.repository = repository;
        this.countQuery = countQuery;
        this.auditLogRepository = auditLogRepository;
        this.owners = owners;
        this.authorLinkRepository = authorLinkRepository;
        this.transactions = new TransactionTemplate(transactionManager);
        this.clock = clock;
    }

    /** 운영자가 관리자 화면에서 가져온다. 이미 있으면 원문 기준으로 교체하고 감사 기록을 남긴다. 고친 공고는 덮어쓰지 않는다. */
    public AuditionPostImportResult importPost(long adminId, String externalId) {
        return importPost(adminId, externalId, false);
    }

    /**
     * 운영자가 고친 공고를 다시 가져오면 고친 내용이 원문으로 돌아가므로, {@code overwriteEdited}로 확인받았을 때만 교체한다.
     * 원문을 내려받기 전에 먼저 확인해 불필요한 파일 업로드를 막는다.
     */
    public AuditionPostImportResult importPost(long adminId, String externalId, boolean overwriteEdited) {
        if (!overwriteEdited) {
            repository.findBySourceAndExternalId(source.getSource(), externalId)
                    .filter(AuditionPost::isEdited)
                    .ifPresent(post -> {
                        throw editedConflict();
                    });
        }
        return importAs(adminId, externalId, overwriteEdited);
    }

    /**
     * 운영 서버의 공고 알림이 새 공고를 자동으로 가져온다. 이미 있는 번호는 운영자가 정한 공개 상태와 다시 가져온 내용을
     * 지키기 위해 건너뛴다. 운영자 작업이 아니므로 감사 기록은 남기지 않는다.
     */
    @Override
    public Optional<Long> importIfAbsent(String sourceName, String externalId) {
        if (!source.getSource().equals(sourceName)) {
            return Optional.empty();
        }
        Optional<AuditionPost> existing = repository.findBySourceAndExternalId(sourceName, externalId);
        if (existing.isPresent()) {
            return existing.map(AuditionPost::getId);
        }
        AuditionPostImportResult result = importAs(null, externalId, false);
        if (!result.skippedAttachments().isEmpty()) {
            log.info("자동 가져오기에서 첨부 {}개를 건너뜀: {}-{}", result.skippedAttachments().size(), sourceName, externalId);
        }
        return Optional.of(result.post().id());
    }

    /** {@code adminId}가 null이면 자동 가져오기다. */
    private AuditionPostImportResult importAs(Long adminId, String externalId, boolean overwriteEdited) {
        SourcePost post = fetch(externalId);
        AuditionPostOrigin origin = new AuditionPostOrigin(source.getSource(), post.externalId(), post.sourceUrl());
        AuditionPostContent content = new AuditionPostContent(
                post.category(), post.title(), post.pay(), post.deadline(), post.authorName(), post.postedAt(),
                post.bodyHtml()
        );
        List<String> uploadedKeys = new ArrayList<>();
        try {
            List<AuditionPostFile> files = new ArrayList<>(storeImages(post.images(), uploadedKeys));
            List<SkippedFile> skipped = new ArrayList<>();
            files.addAll(storeAttachments(post.attachments(), uploadedKeys, skipped));
            Saved saved = save(adminId, origin, post.authorId(), content, post.tags(), files, overwriteEdited);
            fileStorage.deleteQuietly(saved.discarded().stream().map(AuditionPostFile::getObjectKey).toList());
            return new AuditionPostImportResult(saved.post(), saved.created(), skipped);
        } catch (RuntimeException exception) {
            fileStorage.deleteQuietly(uploadedKeys);
            throw exception;
        }
    }

    private SourcePost fetch(String externalId) {
        try {
            return source.fetch(externalId);
        } catch (AuditionPostSourceException exception) {
            throw new BusinessException(SOURCE_UNAVAILABLE, exception.getMessage());
        }
    }

    private List<AuditionPostFile> storeImages(List<SourceFile> images, List<String> uploadedKeys) {
        List<AuditionPostFile> stored = new ArrayList<>();
        for (SourceFile image : images) {
            try (SourceFileContent content = source.open(image, AuditionPostFileRules.MAX_IMAGE_BYTES)) {
                String contentType = AuditionPostFileRules.imageContentType(content.contentType(), image.filename())
                        .orElseThrow(() -> new BusinessException(
                                FILE_REJECTED, "본문 사진 '%s'은(는) 지원하지 않는 형식입니다.", image.filename()
                        ));
                stored.add(store(AuditionPostFileKind.IMAGE, image.filename(), contentType, content, uploadedKeys));
            } catch (SourceFileTooLargeException exception) {
                throw new BusinessException(FILE_REJECTED, "본문 사진 '%s'이(가) 20MB를 넘습니다.", image.filename());
            } catch (AuditionPostSourceException exception) {
                throw new BusinessException(SOURCE_UNAVAILABLE, exception.getMessage());
            }
        }
        return stored;
    }

    /** 형식·크기가 맞지 않는 첨부는 건너뛰고 결과에 알린다. 내려받기 자체가 실패하면 가져오기 전체를 멈춘다. */
    private List<AuditionPostFile> storeAttachments(
            List<SourceFile> attachments,
            List<String> uploadedKeys,
            List<SkippedFile> skipped
    ) {
        List<AuditionPostFile> stored = new ArrayList<>();
        for (SourceFile attachment : attachments) {
            Optional<String> contentType = AuditionPostFileRules.attachmentContentType(attachment.filename());
            if (contentType.isEmpty()) {
                skipped.add(new SkippedFile(attachment.filename(), "지원하지 않는 형식"));
                continue;
            }
            try (SourceFileContent content = source.open(attachment, AuditionPostFileRules.MAX_ATTACHMENT_BYTES)) {
                stored.add(store(
                        AuditionPostFileKind.ATTACHMENT, attachment.filename(), contentType.get(), content, uploadedKeys
                ));
            } catch (SourceFileTooLargeException exception) {
                skipped.add(new SkippedFile(attachment.filename(), "50MB 초과"));
            } catch (AuditionPostSourceException exception) {
                throw new BusinessException(SOURCE_UNAVAILABLE, exception.getMessage());
            }
        }
        return stored;
    }

    private AuditionPostFile store(
            AuditionPostFileKind kind,
            String filename,
            String contentType,
            SourceFileContent content,
            List<String> uploadedKeys
    ) {
        AuditionPostFile file = fileStorage.store(kind, filename, contentType, content.size(), content.content());
        uploadedKeys.add(file.getObjectKey());
        return file;
    }

    private Saved save(
            Long adminId,
            AuditionPostOrigin origin,
            String sourceAuthorId,
            AuditionPostContent content,
            List<String> tags,
            List<AuditionPostFile> files,
            boolean overwriteEdited
    ) {
        Instant now = clock.instant();
        LocalDate today = LocalDate.ofInstant(now, KOREA);
        try {
            return Objects.requireNonNull(transactions.execute(status -> {
                // 운영자 수정과 순서대로 처리해야 수정 확인과 뺀 파일 정리가 서로를 덮지 않는다.
                Optional<AuditionPost> existing = repository.findBySourceAndExternalIdForUpdate(
                        origin.source(), origin.externalId()
                );
                if (existing.isPresent()) {
                    AuditionPost post = existing.get();
                    if (adminId == null) {
                        return new Saved(AdminAuditionPostResult.from(post, today, owners.nameOf(post)), false, files);
                    }
                    // 원문을 내려받는 사이에 운영자가 고쳤을 수 있으므로 저장 직전에도 확인한다.
                    if (post.isEdited() && !overwriteEdited) {
                        throw editedConflict();
                    }
                    final List<AuditionPostFile> discarded = post.refresh(content, tags, files, adminId, now);
                    countQuery.invalidateAfterCommit();
                    post.recordSourceAuthor(sourceAuthorId);
                    connectByAuthorLink(post);
                    audit(adminId, post, "%s %s 원문으로 다시 가져옴");
                    return new Saved(
                            AdminAuditionPostResult.from(post, today, owners.nameOf(post)), false, discarded
                    );
                }
                AuditionPost created = new AuditionPost(origin, content, tags, files, adminId, now);
                created.recordSourceAuthor(sourceAuthorId);
                connectByAuthorLink(created);
                AuditionPost post = repository.saveAndFlush(created);
                countQuery.invalidateAfterCommit();
                audit(adminId, post, "%s %s 처음 가져옴");
                return new Saved(AdminAuditionPostResult.from(post, today, owners.nameOf(post)), true, List.of());
            }));
        } catch (DataIntegrityViolationException | PessimisticLockingFailureException exception) {
            // 처음 가져오는 공고를 동시에 저장하면 MySQL은 빈 자리 잠금 때문에 중복 대신 교착으로 한쪽을 실패시킨다.
            throw new BusinessException(IMPORT_CONFLICT, "같은 공고를 동시에 가져오고 있습니다. 잠시 후 다시 시도해 주세요.");
        }
    }

    /** 원문 작성자에 자동 연결 규칙이 있으면 아직 기획사가 없는 공고를 그 기획사에 연결한다. 운영자가 정한 연결은 바꾸지 않는다. */
    private void connectByAuthorLink(AuditionPost post) {
        if (post.getOwnerId() != null || post.getSourceAuthorId() == null) {
            return;
        }
        authorLinkRepository.findBySourceAndSourceAuthorId(post.getSource(), post.getSourceAuthorId())
                .ifPresent(link -> post.changeOwner(link.getOwnerId()));
    }

    private BusinessException editedConflict() {
        return new BusinessException(
                EDITED, "운영자가 고친 공고입니다. 원문으로 다시 가져오면 고친 내용이 원문으로 돌아갑니다."
        );
    }

    private void audit(Long adminId, AuditionPost post, String detailFormat) {
        if (adminId == null) {
            return;
        }
        auditLogRepository.save(new AdminAuditLog(
                adminId,
                AdminAction.AUDITION_POST_IMPORTED,
                TARGET_TYPE,
                post.getId(),
                detailFormat.formatted(post.getSource(), post.getExternalId())
        ));
    }

    private record Saved(AdminAuditionPostResult post, boolean created, List<AuditionPostFile> discarded) {
    }
}
