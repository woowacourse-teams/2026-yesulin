package art.yesulin.event.application.registration;

import art.yesulin.event.domain.registration.EventActivityField;
import art.yesulin.event.domain.registration.EventParticipantType;
import art.yesulin.event.domain.registration.EventRegistration;
import art.yesulin.event.domain.registration.EventRegistrationCareer;
import art.yesulin.event.domain.registration.EventSnsPlatform;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * 운영 화면의 참가 신청 한 건.
 *
 * @param businessCardRequested 배우가 프로필 명함 제작을 희망했는지. 아니면 명함 정보(이메일·사진 등)가 비어 있다.
 * @param photoUrl 배우 프로필 사진을 잠깐 열 수 있는 내려받기 주소. 명함을 원하지 않은 배우와 공연사 관계자는 null이다.
 * @param activityFields 배우가 고른 분야를 연극·뮤지컬·매체·유튜브·기타 순서로 준다. 공연사 관계자는 비어 있다.
 * @param otherActivity 기타 분야를 고른 배우가 직접 적은 분야
 * @param noCareer 신입이라 경력이 없다고 한 배우
 * @param careers 배우 경력. 적은 순서대로다.
 * @param intro 명함 뒷면에 넣을 한 줄 소개
 */
public record AdminEventRegistrationResult(
        long id,
        EventParticipantType participantType,
        String name,
        String phone,
        boolean businessCardRequested,
        String email,
        String snsHandle,
        LocalDate birthDate,
        String affiliation,
        String photoUrl,
        List<EventActivityField> activityFields,
        String otherActivity,
        boolean noCareer,
        List<Career> careers,
        String intro,
        Instant createdAt,
        EventSnsPlatform snsPlatform
) {

    static AdminEventRegistrationResult from(EventRegistration registration, String photoUrl) {
        return new AdminEventRegistrationResult(
                registration.getId(),
                registration.getParticipantType(),
                registration.getName(),
                registration.getPhone(),
                registration.isBusinessCardRequested(),
                registration.getEmail(),
                registration.getSnsHandle(),
                registration.getBirthDate(),
                registration.getAffiliation(),
                photoUrl,
                registration.getActivityFields().stream().sorted().toList(),
                registration.getOtherActivity(),
                registration.isNoCareer(),
                registration.getCareers().stream().map(Career::from).toList(),
                registration.getIntro(),
                registration.getCreatedAt(),
                registration.getSnsPlatform()
        );
    }

    /**
     * 경력 한 줄.
     *
     * @param performedMonth {@code YYYY-MM}
     */
    public record Career(String performedMonth, String workTitle, String role) {

        static Career from(EventRegistrationCareer career) {
            return new Career(career.getPerformedMonth(), career.getWorkTitle(), career.getRole());
        }
    }
}
