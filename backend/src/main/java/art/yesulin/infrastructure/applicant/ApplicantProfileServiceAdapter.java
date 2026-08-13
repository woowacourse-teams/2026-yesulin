package art.yesulin.infrastructure.applicant;

import art.yesulin.application.applicant.ApplicantAccessException;
import art.yesulin.application.applicant.ApplicantProfileCommand;
import art.yesulin.application.applicant.ApplicantProfileResult;
import art.yesulin.application.applicant.ApplicantProfileService;
import art.yesulin.domain.applicant.ApplicantProfile;
import art.yesulin.domain.applicant.ProfilePhoto;
import art.yesulin.infrastructure.account.ApplicantJpaEntity;
import art.yesulin.infrastructure.account.ApplicantJpaRepository;
import java.net.URI;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Service
@Transactional(readOnly = true)
public class ApplicantProfileServiceAdapter implements ApplicantProfileService {

    private final ApplicantJpaRepository applicantRepository;
    private final ApplicantProfileJpaRepository profileRepository;
    private final ProfilePhotoJpaRepository photoRepository;
    private final ObjectMapper objectMapper;
    private final Clock clock;

    public ApplicantProfileServiceAdapter(
            ApplicantJpaRepository applicantRepository,
            ApplicantProfileJpaRepository profileRepository,
            ProfilePhotoJpaRepository photoRepository,
            ObjectMapper objectMapper,
            Clock clock) {
        this.applicantRepository = applicantRepository;
        this.profileRepository = profileRepository;
        this.photoRepository = photoRepository;
        this.objectMapper = objectMapper;
        this.clock = clock;
    }

    @Override
    public ApplicantProfileResult get(long accountId) {
        ApplicantJpaEntity applicant = findApplicant(accountId);
        return profileRepository.findByApplicantId(applicant.id())
                .map(this::toResult)
                .orElseGet(() -> ApplicantProfileResult.empty(applicant.id()));
    }

    @Transactional
    @Override
    public ApplicantProfileResult update(long accountId, ApplicantProfileCommand command) {
        ApplicantJpaEntity applicant = findApplicant(accountId);
        List<ProfilePhoto> domainPhotos = command.photoUrls().stream()
                .map(URI::create)
                .map(ProfilePhoto::new)
                .toList();
        ApplicantProfile.create(command.activityName(), domainPhotos);
        ApplicantProfileJpaEntity profile = profileRepository.findByApplicantId(applicant.id())
                .orElseGet(() -> ApplicantProfileJpaEntity.create(applicant.id()));
        LocalDateTime now = LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
        profile.update(
                command.activityName(),
                command.name(),
                command.height(),
                command.weight(),
                command.birthDate(),
                command.gender(),
                command.phone(),
                command.email(),
                command.residence(),
                writeJson(command.additionalInformation()),
                command.profileSaveConsent() ? now : null,
                now);
        ApplicantProfileJpaEntity saved = profileRepository.save(profile);
        photoRepository.deleteAllByApplicantProfileId(saved.id());
        for (int index = 0; index < command.photoUrls().size(); index++) {
            photoRepository.save(ProfilePhotoJpaEntity.create(
                    saved.id(), index + 1, command.photoUrls().get(index), now));
        }
        return toResult(saved);
    }

    private ApplicantJpaEntity findApplicant(long accountId) {
        return applicantRepository.findByAccountId(accountId)
                .orElseThrow(ApplicantAccessException::new);
    }

    private ApplicantProfileResult toResult(ApplicantProfileJpaEntity profile) {
        List<String> photoUrls = photoRepository
                .findAllByApplicantProfileIdOrderByPhotoOrder(profile.id()).stream()
                .map(ProfilePhotoJpaEntity::url)
                .toList();
        return new ApplicantProfileResult(
                profile.applicantId(), profile.activityName(), profile.name(), profile.height(),
                profile.weight(), profile.birthDate(), profile.gender(), profile.phone(),
                profile.email(), profile.residence(),
                readJson(profile.additionalInformation()), photoUrls,
                toInstant(profile.consentedAt()), toInstant(profile.updatedAt()));
    }

    private Instant toInstant(LocalDateTime value) {
        return value == null ? null : value.toInstant(ZoneOffset.UTC);
    }

    private String writeJson(Map<String, Object> value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JacksonException exception) {
            throw new IllegalArgumentException("추가 프로필 정보를 JSON으로 변환할 수 없습니다.", exception);
        }
    }

    private Map<String, Object> readJson(String value) {
        try {
            return objectMapper.readValue(value, new TypeReference<Map<String, Object>>() {});
        } catch (JacksonException exception) {
            throw new IllegalStateException("저장된 프로필 JSON이 올바르지 않습니다.", exception);
        }
    }
}
