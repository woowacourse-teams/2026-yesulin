package art.yesulin.application.otraudition;

import static art.yesulin.domain.otraudition.OtrAuditionErrorCode.CLOSED;
import static art.yesulin.domain.otraudition.OtrAuditionErrorCode.DUPLICATE_SUBMISSION;
import static art.yesulin.domain.otraudition.OtrAuditionErrorCode.INVALID_INPUT;
import static art.yesulin.domain.otraudition.OtrAuditionErrorCode.NOT_FOUND;
import static art.yesulin.domain.otraudition.OtrAuditionErrorCode.STALE_POSTING_SNAPSHOT;

import art.yesulin.application.audition.PostingSnapshotVersionGenerator;
import art.yesulin.application.submission.consent.SubmissionConsentDocumentMetadata;
import art.yesulin.application.submission.consent.SubmissionConsentDocumentProvider;
import art.yesulin.common.exception.BusinessException;
import art.yesulin.domain.file.FileAsset;
import art.yesulin.domain.file.FileAssetRepository;
import art.yesulin.domain.file.FileReference;
import art.yesulin.domain.file.FileReferenceRepository;
import art.yesulin.domain.file.FileType;
import art.yesulin.domain.otraudition.OtrAudition;
import art.yesulin.domain.otraudition.OtrAuditionRepository;
import art.yesulin.domain.otraudition.OtrSubmission;
import art.yesulin.domain.otraudition.OtrSubmissionRepository;
import art.yesulin.domain.producer.ProducerRepository;
import art.yesulin.domain.submission.SubmissionBasicInformation;
import art.yesulin.domain.submission.SubmissionType;
import art.yesulin.domain.video.YouTubeVideoUrl;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OtrSubmissionService {

    private static final ZoneId KOREA = ZoneId.of("Asia/Seoul");

    private final OtrAuditionRepository auditionRepository;
    private final OtrSubmissionRepository submissionRepository;
    private final ProducerRepository producerRepository;
    private final FileAssetRepository fileAssetRepository;
    private final FileReferenceRepository fileReferenceRepository;
    private final SubmissionConsentDocumentProvider consentDocumentProvider;
    private final PostingSnapshotVersionGenerator snapshotVersionGenerator;
    private final Clock clock;

    @Transactional(readOnly = true)
    public PublicOtrAuditionResult findPublic(UUID publicId) {
        OtrAudition audition = findAudition(publicId);
        String producerName = producerName(audition.getOwnerId());
        return PublicOtrAuditionResult.from(audition, producerName,
                snapshotVersionGenerator.generate(audition.getPublicId(), producerName), today());
    }

    @Transactional
    public OtrSubmissionResult submit(long applicantId, UUID publicId, OtrSubmissionInput input) {
        OtrAudition audition = auditionRepository.findForUpdateByPublicId(publicId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "OTR 공고를 찾을 수 없습니다."));
        if (!audition.isOpenOn(today())) {
            throw new BusinessException(CLOSED, "OTR 공고의 지원 마감일이 지났습니다.");
        }
        if (submissionRepository.existsByOtrAuditionIdAndApplicantId(audition.getId(), applicantId)) {
            throw new BusinessException(DUPLICATE_SUBMISSION, "이미 지원한 OTR 공고입니다.");
        }
        if (input == null || input.type() != SubmissionType.OTR || input.basicInformation() == null
                || input.additionalInformation() == null || !audition.hasRole(input.selectedRole())) {
            throw new BusinessException(INVALID_INPUT, "지원할 배역과 기본 정보를 확인해 주세요.");
        }
        String producerName = producerName(audition.getOwnerId());
        if (!snapshotVersionGenerator.generate(audition.getPublicId(), producerName)
                .equals(input.postingSnapshotVersion())) {
            throw new BusinessException(STALE_POSTING_SNAPSHOT,
                    "공연사 정보가 변경되었습니다. 지원 페이지를 새로고침하고 동의를 다시 확인해 주세요.");
        }
        validateBasicInformation(input);
        validatePhotos(applicantId, input.photoFileIds());
        List<String> videoUrls = validateVideos(input.videoUrls());
        if (!input.privacyCollectionAndUseAgreed() || !input.thirdPartyProvisionAgreed()) {
            throw new BusinessException(INVALID_INPUT, "개인정보 수집·이용 및 제3자 제공 동의가 필요합니다.");
        }
        Instant submittedAt = clock.instant();
        SubmissionConsentDocumentMetadata consent = consentDocumentProvider.currentFor(
                audition.getId(), producerName, submittedAt);
        OtrSubmission submission = new OtrSubmission(audition.getId(), applicantId, input.selectedRole(),
                input.basicInformation(), input.additionalInformation(), input.photoFileIds(), videoUrls,
                consent.thirdPartyRecipientName(),
                consent.privacyCollectionAndUseVersion(), consent.thirdPartyProvisionVersion(), submittedAt);
        try {
            OtrSubmission saved = submissionRepository.saveAndFlush(submission);
            fileReferenceRepository.saveAllAndFlush(input.photoFileIds().stream()
                    .map(fileId -> new FileReference("OTR_SUBMISSION_PHOTO", saved.getId(), fileId))
                    .toList());
            return new OtrSubmissionResult(saved.getId(), saved.getSubmittedAt());
        } catch (DataIntegrityViolationException exception) {
            if (isDuplicateSubmission(exception)) {
                throw new BusinessException(DUPLICATE_SUBMISSION, "이미 지원한 OTR 공고입니다.");
            }
            throw exception;
        }
    }

    private void validateBasicInformation(OtrSubmissionInput input) {
        SubmissionBasicInformation basic = input.basicInformation();
        if (basic.name() == null || basic.height() == null || basic.weight() == null
                || basic.birthDate() == null || basic.birthDate().isAfter(today()) || basic.gender() == null
                || basic.phone() == null || basic.email() == null || basic.address() == null) {
            throw new BusinessException(INVALID_INPUT, "기본 정보의 모든 항목을 입력해 주세요.");
        }
    }

    private void validatePhotos(long applicantId, List<Long> fileIds) {
        if (fileIds == null || fileIds.size() > 3 || fileIds.stream().anyMatch(id -> id == null || id <= 0)
                || Set.copyOf(fileIds).size() != fileIds.size()) {
            throw new BusinessException(INVALID_INPUT, "서로 다른 사진을 최대 3장까지 제출해 주세요.");
        }
        List<FileAsset> assets = fileAssetRepository.findAllByIdInAndOwnerId(fileIds, applicantId);
        if (assets.size() != fileIds.size()) {
            throw new BusinessException(INVALID_INPUT, "본인이 업로드한 사진만 선택해 주세요.");
        }
        for (FileAsset asset : assets) {
            asset.ensureUsable();
            if (asset.getMetadata().getType() != FileType.IMAGE) {
                throw new BusinessException(INVALID_INPUT, "이미지 파일만 제출할 수 있습니다.");
            }
        }
    }

    private List<String> validateVideos(List<String> urls) {
        if (urls == null || urls.size() > 3) {
            throw new BusinessException(INVALID_INPUT, "YouTube 영상은 최대 3개까지 입력해 주세요.");
        }
        List<String> normalized = urls.stream().map(url -> YouTubeVideoUrl.parse(url)
                .orElseThrow(() -> new BusinessException(INVALID_INPUT, "올바른 YouTube 영상 링크를 입력해 주세요."))
                .url()).toList();
        if (Set.copyOf(normalized).size() != normalized.size()) {
            throw new BusinessException(INVALID_INPUT, "같은 YouTube 영상을 중복해서 입력할 수 없습니다.");
        }
        return normalized;
    }

    private OtrAudition findAudition(UUID publicId) {
        return auditionRepository.findByPublicId(publicId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "OTR 공고를 찾을 수 없습니다."));
    }

    private String producerName(long ownerId) {
        return producerRepository.findByMemberId(ownerId)
                .orElseThrow(() -> new BusinessException(NOT_FOUND, "공연사 정보를 찾을 수 없습니다."))
                .getCompanyName();
    }

    private LocalDate today() {
        return LocalDate.now(clock.withZone(KOREA));
    }

    private boolean isDuplicateSubmission(DataIntegrityViolationException exception) {
        Throwable cause = exception;
        while (cause != null) {
            if (cause instanceof ConstraintViolationException violation
                    && violation.getConstraintName() != null
                    && violation.getConstraintName().toLowerCase(Locale.ROOT)
                            .contains("uk_otr_submissions_audition_applicant")) {
                return true;
            }
            cause = cause.getCause();
        }
        return false;
    }
}
