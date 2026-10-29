package art.yesulin.actor.application.page;

import art.yesulin.actor.domain.profile.ProfileGender;
import java.util.UUID;

/**
 * 배우 목록 카드 한 장. 키·몸무게는 입력했으면 항상 공개되는 값이다.
 *
 * @param age 한국 날짜 기준 만 나이
 */
public record PublicActorPageSummaryResult(
        UUID publicId,
        String handle,
        String name,
        ProfileGender gender,
        Integer birthYear,
        Integer age,
        Integer height,
        Integer weight,
        String representativePhotoUrl
) {
}
