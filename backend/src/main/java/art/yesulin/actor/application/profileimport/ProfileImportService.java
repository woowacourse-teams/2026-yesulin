package art.yesulin.actor.application.profileimport;

import static art.yesulin.actor.domain.photolibrary.PhotoLibraryErrorCode.LIMIT_EXCEEDED;
import static art.yesulin.actor.domain.profileimport.ProfileImportErrorCode.PROFILE_IMPORT_DAILY_LIMIT;
import static art.yesulin.actor.domain.profileimport.ProfileImportErrorCode.PROFILE_IMPORT_IN_PROGRESS;
import static art.yesulin.actor.domain.profileimport.ProfileImportErrorCode.PROFILE_IMPORT_NOT_FINISHED;
import static art.yesulin.actor.domain.profileimport.ProfileImportErrorCode.PROFILE_IMPORT_NOT_FOUND;
import static art.yesulin.actor.domain.profileimport.ProfileImportErrorCode.PROFILE_IMPORT_PHOTO_NOT_FOUND;

import art.yesulin.actor.application.photolibrary.AddPhotoToLibraryCommand;
import art.yesulin.actor.application.photolibrary.PhotoLibraryItemResult;
import art.yesulin.actor.application.photolibrary.PhotoLibraryService;
import art.yesulin.actor.domain.photolibrary.PhotoLibrary;
import art.yesulin.auth.domain.member.MemberErrorCode;
import art.yesulin.auth.domain.member.MemberRepository;
import art.yesulin.file.application.FileService;
import art.yesulin.global.exception.BusinessException;
import art.yesulin.pdfextraction.application.PdfExtractionResult;
import art.yesulin.pdfextraction.application.PdfExtractionService;
import art.yesulin.pdfextraction.application.PdfExtractionStorage;
import art.yesulin.pdfextraction.domain.PdfExtractionJob;
import art.yesulin.pdfextraction.domain.PdfExtractionJobRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionPayloadRepository;
import art.yesulin.pdfextraction.domain.PdfExtractionPurpose;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 배우가 자기 PDF 프로필로 편집 화면을 채운다. 공연사 PDF 심사와 같은 업로드·추출 흐름을 쓰되 작업 목적으로 데이터와 권한을
 * 나눈다. 하루 1회(한국 날짜)이고 실패·빈 결과는 세지 않는다. 결과를 닫거나 결과가 나온 뒤 24시간이 지나면 원본·추출 본문·
 * 이미지를 지우며, 보관함에 넣은 사진은 새 배우 사진 파일이라 남는다. 업로드 준비는 회원 행을 잠가 같은 배우의 요청을 직렬화한다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "yesulin.pdf-extraction", name = "enabled", havingValue = "true")
public class ProfileImportService {

    static final Duration KEEP_FOR = Duration.ofHours(24);
    private static final Duration UPLOAD_WINDOW = Duration.ofMinutes(10);
    private static final ZoneId DATE_ZONE = ZoneId.of("Asia/Seoul");
    private static final PdfExtractionPurpose PURPOSE = PdfExtractionPurpose.ACTOR_PROFILE;
    private static final int MAX_PHOTO_BYTES = 20 * 1024 * 1024;
    private static final int CLEANUP_BATCH = 100;

    private final PdfExtractionJobRepository jobs;
    private final PdfExtractionPayloadRepository payloads;
    private final PdfExtractionStorage storage;
    private final PdfExtractionService extraction;
    private final FileService files;
    private final PhotoLibraryService photos;
    private final Clock clock;
    private final MemberRepository members;

    @Transactional(readOnly = true)
    public ProfileImportOverview findCurrent(long ownerId) {
        Instant now = clock.instant();
        List<PdfExtractionJob> recent = recent(ownerId, now);
        PdfExtractionJob current = recent.stream()
                .filter(job -> !job.isDeleted())
                .max(Comparator.comparing(PdfExtractionJob::getCreatedAt))
                .orElse(null);
        return new ProfileImportOverview(usedToday(recent, now), current == null ? null : view(current));
    }

    /** 진행 중인 가져오기가 있거나 오늘 이미 썼으면 새로 올리지 못한다. */
    @Transactional
    public PreparedProfileImport prepare(long ownerId, String filename, long size) {
        members.findForUpdate(ownerId)
                .orElseThrow(() -> new BusinessException(MemberErrorCode.MEMBER_NOT_FOUND, "회원을 찾을 수 없습니다."));
        Instant now = clock.instant();
        List<PdfExtractionJob> recent = recent(ownerId, now);
        if (recent.stream().anyMatch(job -> !job.isDeleted() && job.isInProgress(now))) {
            throw inProgress("PDF를 읽고 있어요. 끝난 뒤 다시 시도해 주세요.");
        }
        if (usedToday(recent, now)) {
            throw new BusinessException(PROFILE_IMPORT_DAILY_LIMIT,
                    "PDF로 채우기는 하루에 한 번 쓸 수 있습니다. 내일 다시 시도해 주세요.");
        }
        PdfExtractionJob job = jobs.save(
                PdfExtractionJob.forActorProfile(ownerId, filename, size, now, now.plus(UPLOAD_WINDOW))
        );
        return new PreparedProfileImport(job.getId(), storage.prepare(job));
    }

    /** 브라우저가 올린 PDF를 확인한다. 이미 확인했거나 결과가 먼저 왔으면 그대로 둔다. */
    @Transactional
    public ProfileImportResult complete(long ownerId, String jobId) {
        PdfExtractionJob job = ownedForUpdate(ownerId, jobId);
        if (job.getUploadedAt() == null) {
            storage.verifySource(job);
            job.confirmUpload(clock.instant());
        }
        return view(job);
    }

    @Transactional(readOnly = true)
    public ProfileImportResult find(long ownerId, String jobId) {
        PdfExtractionJob job = jobs.findByIdAndOwnerIdAndPurpose(jobId, ownerId, PURPOSE)
                .filter(found -> !found.isDeleted())
                .orElseThrow(ProfileImportService::notFound);
        return view(job);
    }

    /** 사진 후보를 새 배우 사진 파일로 복사해 보관함 맨 뒤에 넣는다. 보관함 한도(3장)를 넘기지 않는다. */
    @Transactional
    public PhotoLibraryItemResult addPhoto(long ownerId, String jobId, String fileKey) {
        PdfExtractionJob job = ownedForUpdate(ownerId, jobId);
        if (!job.isFinished()) {
            throw new BusinessException(PROFILE_IMPORT_NOT_FINISHED, "PDF를 다 읽은 뒤 사진을 넣을 수 있습니다.");
        }
        PdfExtractionResult result = extraction.storedResult(job);
        boolean candidate = result != null && result.pages().stream()
                .flatMap(page -> page.images().stream())
                .anyMatch(image -> PdfExtractionResult.CANDIDATE.equals(image.classification())
                        && image.fileKey().equals(fileKey));
        if (!candidate) {
            throw photoNotFound();
        }
        if (photos.findPhotos(ownerId).photos().size() >= PhotoLibrary.MAX_PHOTO_COUNT) {
            throw new BusinessException(LIMIT_EXCEEDED, "사진보관함에는 사진을 최대 3장까지 저장할 수 있습니다.");
        }
        byte[] image = storage.readImage(job, fileKey, MAX_PHOTO_BYTES)
                .orElseThrow(ProfileImportService::photoNotFound);
        long fileId = files.createPrivateActorPhoto(ownerId, "pdf-profile-photo.png", "image/png", image);
        return photos.addPhoto(ownerId, new AddPhotoToLibraryCommand(fileId));
    }

    /** 결과를 닫으면 원본·추출 본문·이미지를 바로 지운다. 이미 지웠으면 그대로 성공한다. 읽는 중에는 닫지 못한다. */
    @Transactional
    public void close(long ownerId, String jobId) {
        PdfExtractionJob job = jobs.findOwnedForUpdate(jobId, ownerId, PURPOSE)
                .orElseThrow(ProfileImportService::notFound);
        if (job.isDeleted()) {
            return;
        }
        if (job.isInProgress(clock.instant())) {
            throw inProgress("PDF를 읽고 있어 지금은 닫을 수 없습니다. 끝난 뒤 닫아 주세요.");
        }
        delete(job);
    }

    /** 결과가 나온 뒤(결과가 없으면 올린 뒤) 24시간이 지난 가져오기를 지운다. 한 건이 실패해도 나머지는 계속 지운다. */
    @Transactional
    public int deleteExpired() {
        List<PdfExtractionJob> expired = jobs.findExpired(
                PURPOSE, clock.instant().minus(KEEP_FOR), PageRequest.of(0, CLEANUP_BATCH)
        );
        int deleted = 0;
        for (PdfExtractionJob job : expired) {
            try {
                delete(job);
                deleted++;
            } catch (RuntimeException exception) {
                log.error("PDF로 채우기 결과를 지우지 못함 jobId={}", job.getId(), exception);
            }
        }
        return deleted;
    }

    /** 저장소에서 지우지 못하면 예외가 나서 지운 것으로 기록하지 않으므로, 정리 작업이 다음에 다시 지운다. */
    private void delete(PdfExtractionJob job) {
        storage.deleteAll(job);
        payloads.findById(job.getId()).ifPresent(payloads::delete);
        job.markDeleted(clock.instant());
    }

    private ProfileImportResult view(PdfExtractionJob job) {
        Instant base = job.getFinishedAt() == null ? job.getCreatedAt() : job.getFinishedAt();
        PdfExtractionResult result = job.isFinished() ? extraction.storedResult(job) : null;
        return ProfileImportResult.of(job.getId(), extraction.pendingStatus(job), job.getOriginalFilename(),
                job.getCreatedAt(), base.plus(KEEP_FOR), result);
    }

    private PdfExtractionJob ownedForUpdate(long ownerId, String jobId) {
        return jobs.findOwnedForUpdate(jobId, ownerId, PURPOSE)
                .filter(job -> !job.isDeleted())
                .orElseThrow(ProfileImportService::notFound);
    }

    /** 진행 중 작업은 24시간 안에 있고, 오늘 0시는 언제나 24시간 안이다. */
    private List<PdfExtractionJob> recent(long ownerId, Instant now) {
        return jobs.findAllByOwnerIdAndPurposeAndCreatedAtGreaterThanEqual(ownerId, PURPOSE, now.minus(KEEP_FOR));
    }

    private boolean usedToday(List<PdfExtractionJob> recent, Instant now) {
        Instant startOfToday = LocalDate.ofInstant(now, DATE_ZONE).atStartOfDay(DATE_ZONE).toInstant();
        return recent.stream().anyMatch(job -> job.isDailyQuotaUsed() && !job.getCreatedAt().isBefore(startOfToday));
    }

    private static BusinessException inProgress(String message) {
        return new BusinessException(PROFILE_IMPORT_IN_PROGRESS, message);
    }

    private static BusinessException notFound() {
        return new BusinessException(PROFILE_IMPORT_NOT_FOUND, "PDF로 채우기 결과를 찾을 수 없습니다.");
    }

    private static BusinessException photoNotFound() {
        return new BusinessException(PROFILE_IMPORT_PHOTO_NOT_FOUND, "사진 후보를 찾을 수 없습니다.");
    }
}
