package art.yesulin.dormant.application.profile;

import static art.yesulin.dormant.domain.profile.ProfileErrorCode.INVALID_PROFILE;
import static art.yesulin.global.validation.DomainValidator.requireNonNull;
import static art.yesulin.global.validation.DomainValidator.requirePositive;

import art.yesulin.dormant.domain.profile.ApplicantProfile;
import art.yesulin.dormant.domain.profile.ApplicantProfileRepository;
import art.yesulin.global.exception.BusinessException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ApplicantProfileService {

    private static final ZoneId PROFILE_DATE_ZONE = ZoneId.of("Asia/Seoul");

    private final ApplicantProfileRepository profileRepository;
    private final Clock clock;

    @Transactional(readOnly = true)
    public ApplicantProfileResult find(long ownerId) {
        long validOwnerId = requirePositive(ownerId, "프로필 소유자 ID는 1 이상이어야 합니다.");
        return profileRepository.findByOwnerId(validOwnerId)
                .map(ApplicantProfileResult::from)
                .orElseGet(ApplicantProfileResult::empty);
    }

    @Transactional
    public ApplicantProfileResult update(long ownerId, UpdateApplicantProfileCommand command) {
        long validOwnerId = requirePositive(ownerId, "프로필 소유자 ID는 1 이상이어야 합니다.");
        UpdateApplicantProfileCommand validCommand = requireNonNull(command, "수정할 프로필은 필수입니다.");
        ensureUpdateExists(validCommand);

        ApplicantProfile profile = profileRepository.findByOwnerIdForUpdate(validOwnerId)
                .orElseGet(() -> new ApplicantProfile(validOwnerId));
        LocalDate today = LocalDate.now(clock.withZone(PROFILE_DATE_ZONE));
        if (validCommand.basicInformation() != null) {
            profile.replaceBasicInformation(validCommand.basicInformation().toInformation(today));
        }
        if (validCommand.additionalInformation() != null) {
            profile.replaceAdditionalInformation(validCommand.additionalInformation().toInformation());
        }
        return ApplicantProfileResult.from(profileRepository.saveAndFlush(profile));
    }

    private void ensureUpdateExists(UpdateApplicantProfileCommand command) {
        if (command.basicInformation() == null && command.additionalInformation() == null) {
            throw new BusinessException(INVALID_PROFILE, "변경할 프로필 정보가 없습니다.");
        }
    }
}
