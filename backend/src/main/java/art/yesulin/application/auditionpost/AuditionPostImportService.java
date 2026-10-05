package art.yesulin.application.auditionpost;

import static art.yesulin.domain.auditionpost.AuditionPostErrorCode.FILE_REJECTED;
import static art.yesulin.domain.auditionpost.AuditionPostErrorCode.IMPORT_CONFLICT;
import static art.yesulin.domain.auditionpost.AuditionPostErrorCode.SOURCE_UNAVAILABLE;

import art.yesulin.application.auditionpost.AuditionPostImportResult.SkippedFile;
import art.yesulin.application.file.storage.ObjectStorage;
import art.yesulin.application.file.storage.ObjectUpload;
import art.yesulin.application.notice.AuditionPublisher;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.admin.AdminAction;
import art.yesulin.domain.admin.AdminAuditLog;
import art.yesulin.domain.admin.AdminAuditLogRepository;
import art.yesulin.domain.auditionpost.AuditionPost;
import art.yesulin.domain.auditionpost.AuditionPostContent;
import art.yesulin.domain.auditionpost.AuditionPostFile;
import art.yesulin.domain.auditionpost.AuditionPostFileKind;
import art.yesulin.domain.auditionpost.AuditionPostOrigin;
import art.yesulin.domain.auditionpost.AuditionPostRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * 운영자가 고른 원문 공고 한 건을 본문·사진·첨부파일까지 옮겨 바로 공개한다. 제작사 허락은 게시한 뒤 운영자가 받고,
 * 거절하면 숨긴다. 원문과 파일을 내려받는 동안에는 DB 트랜잭션을 잡지 않고, 마지막 저장만 짧은 트랜잭션으로 처리한다.
 * 저장에 실패하면 이번에 올린 파일을 지우고, 다시 가져와 교체한 경우에는 커밋 뒤 예전 파일을 지운다.
 */
@Slf4j
@Service
public class AuditionPostImportService implements AuditionPublisher {

    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter KEY_DATE = DateTimeFormatter.ofPattern("yyyyMMdd").withZone(ZoneOffset.UTC);
    /** 공고 전용 공개 경로. CloudFront의 환경별 공고 동작으로 제공한다. */
    private static final String OBJECT_KEY_FORMAT = "public/audition-posts/%s/%s";
    private static final String TARGET_TYPE = "AUDITION_POST";

    private final AuditionPostSource source;
    private final ObjectStorage storage;
    private final AuditionPostRepository repository;
    private final AdminAuditLogRepository auditLogRepository;
    private final TransactionTemplate transactions;
    private final Clock clock;

    public AuditionPostImportService(
            AuditionPostSource source,
            ObjectStorage storage,
            AuditionPostRepository repository,
            AdminAuditLogRepository auditLogRepository,
            PlatformTransactionManager transactionManager,
            Clock clock
    ) {
        this.source = source;
        this.storage = storage;
        this.repository = repository;
        this.auditLogRepository = auditLogRepository;
        this.transactions = new TransactionTemplate(transactionManager);
        this.clock = clock;
    }

    /** 운영자가 관리자 화면에서 가져온다. 이미 있으면 원문 기준으로 교체하고 감사 기록을 남긴다. */
    public AuditionPostImportResult importPost(long adminId, String externalId) {
        return importAs(adminId, externalId);
    }

    /**
     * 운영 서버의 공고 알림이 새 공고를 자동으로 게시한다. 이미 있는 번호는 운영자가 숨겼거나 다시 가져온 상태를
     * 지키기 위해 건너뛴다. 운영자 작업이 아니므로 감사 기록은 남기지 않는다.
     */
    @Override
    public Optional<Long> publish(String sourceName, String externalId) {
        if (!source.getSource().equals(sourceName)) {
            return Optional.empty();
        }
        Optional<AuditionPost> existing = repository.findBySourceAndExternalId(sourceName, externalId);
        if (existing.isPresent()) {
            return existing.filter(AuditionPost::isPublished).map(AuditionPost::getId);
        }
        AuditionPostImportResult result = importAs(null, externalId);
        if (!result.skippedAttachments().isEmpty()) {
            log.info("자동 게시에서 첨부 {}개를 건너뜀: {}-{}", result.skippedAttachments().size(), sourceName, externalId);
        }
        return Optional.of(result.post().id());
    }

    /** {@code adminId}가 null이면 자동 게시다. */
    private AuditionPostImportResult importAs(Long adminId, String externalId) {
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
            Saved saved = save(adminId, origin, content, post.tags(), files);
            deleteQuietly(saved.replaced().stream().map(AuditionPostFile::getObjectKey).toList());
            return new AuditionPostImportResult(saved.post(), saved.created(), skipped);
        } catch (RuntimeException exception) {
            deleteQuietly(uploadedKeys);
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
                String objectKey = store(content, contentType, null, uploadedKeys);
                stored.add(new AuditionPostFile(
                        AuditionPostFileKind.IMAGE, objectKey, image.filename(), contentType, content.size()
                ));
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
                String disposition = AuditionPostFileRules.attachmentDisposition(attachment.filename());
                String objectKey = store(content, contentType.get(), disposition, uploadedKeys);
                stored.add(new AuditionPostFile(
                        AuditionPostFileKind.ATTACHMENT, objectKey, attachment.filename(), contentType.get(),
                        content.size()
                ));
            } catch (SourceFileTooLargeException exception) {
                skipped.add(new SkippedFile(attachment.filename(), "50MB 초과"));
            } catch (AuditionPostSourceException exception) {
                throw new BusinessException(SOURCE_UNAVAILABLE, exception.getMessage());
            }
        }
        return stored;
    }

    private String store(
            SourceFileContent content,
            String contentType,
            String disposition,
            List<String> uploadedKeys
    ) {
        String objectKey = OBJECT_KEY_FORMAT.formatted(KEY_DATE.format(clock.instant()), UUID.randomUUID());
        storage.put(objectKey, new ObjectUpload(contentType, disposition, content.size(), content.content()));
        uploadedKeys.add(objectKey);
        return objectKey;
    }

    private Saved save(
            Long adminId,
            AuditionPostOrigin origin,
            AuditionPostContent content,
            List<String> tags,
            List<AuditionPostFile> files
    ) {
        Instant now = clock.instant();
        LocalDate today = LocalDate.ofInstant(now, KOREA);
        try {
            return Objects.requireNonNull(transactions.execute(status -> {
                Optional<AuditionPost> existing = repository.findBySourceAndExternalId(
                        origin.source(), origin.externalId()
                );
                if (existing.isPresent()) {
                    AuditionPost post = existing.get();
                    List<AuditionPostFile> replaced = post.refresh(content, tags, files, adminId, now);
                    audit(adminId, post, "%s %s 원문으로 다시 가져옴");
                    return new Saved(AdminAuditionPostResult.from(post, today), false, replaced);
                }
                AuditionPost post = repository.saveAndFlush(
                        new AuditionPost(origin, content, tags, files, adminId, now)
                );
                audit(adminId, post, "%s %s 처음 가져옴");
                return new Saved(AdminAuditionPostResult.from(post, today), true, List.of());
            }));
        } catch (DataIntegrityViolationException exception) {
            throw new BusinessException(IMPORT_CONFLICT, "같은 공고를 동시에 가져오고 있습니다. 잠시 후 다시 시도해 주세요.");
        }
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

    private void deleteQuietly(List<String> objectKeys) {
        for (String objectKey : objectKeys) {
            try {
                storage.delete(objectKey);
            } catch (RuntimeException exception) {
                log.warn("가져온 공고 파일 정리 실패: {}", exception.getClass().getSimpleName());
            }
        }
    }

    private record Saved(AdminAuditionPostResult post, boolean created, List<AuditionPostFile> replaced) {
    }
}
