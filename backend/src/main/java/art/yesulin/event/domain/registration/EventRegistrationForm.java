package art.yesulin.event.domain.registration;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

/**
 * 신청자가 적은 참가 신청서. 구분에 맞지 않는 칸(배우의 소속, 공연사 관계자의 생년월일·분야·경력)은 저장하지 않는다.
 *
 * @param snsHandle 인스타그램 같은 SNS 계정. 선택이다.
 * @param birthDate 배우만 받는다.
 * @param affiliation 공연사 관계자만 받는 소속과 지금 하는 일
 * @param activityFields 배우가 활동하거나 준비하는 분야. 하나 이상 고른다.
 * @param otherActivity 기타 분야를 고른 배우가 직접 적은 분야
 * @param noCareer 신입이라 경력이 없는 배우. 켜면 경력을 받지 않는다.
 * @param careers 배우 경력. 경력이 없다고 하지 않았으면 한 줄 이상 적는다.
 */
public record EventRegistrationForm(
        EventParticipantType participantType,
        String name,
        String phone,
        String email,
        String snsHandle,
        LocalDate birthDate,
        String affiliation,
        Set<EventActivityField> activityFields,
        String otherActivity,
        boolean noCareer,
        List<EventRegistrationCareer> careers
) {

    /** 분야·경력 없이 쓰는 신청서. 공연사 관계자 신청과 테스트에서 쓴다. */
    public EventRegistrationForm(
            EventParticipantType participantType,
            String name,
            String phone,
            String email,
            String snsHandle,
            LocalDate birthDate,
            String affiliation
    ) {
        this(participantType, name, phone, email, snsHandle, birthDate, affiliation, Set.of(), null, false, List.of());
    }
}
