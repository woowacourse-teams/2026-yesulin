package art.yesulin.event.application.registration;

import art.yesulin.event.domain.registration.EventParticipantType;

/** 접수 완료 알림에 필요한 행사와 신청 구분만 담는다. 신청자의 이름·연락처·사진은 포함하지 않는다. */
public record EventRegisteredEvent(
        long eventId,
        String eventTitle,
        long registrationId,
        EventParticipantType participantType,
        boolean businessCardRequested
) {
}
