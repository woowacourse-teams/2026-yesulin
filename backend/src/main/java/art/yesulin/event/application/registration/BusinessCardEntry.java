package art.yesulin.event.application.registration;

import art.yesulin.event.application.registration.AdminEventRegistrationResult.Career;
import art.yesulin.event.domain.registration.EventActivityField;
import art.yesulin.event.domain.registration.EventRegistration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * 명함 자료 내려받기에 담을 명함 희망 배우 한 명. 휴대폰 번호는 명함에 넣지 않으므로 담지 않는다.
 *
 * @param photoFile 묶음 안의 사진 파일 경로(예: {@code photos/12.jpg}). 사진을 읽지 못했으면 null이다.
 * @param photoKey 저장소에서 사진을 읽을 키. 묶음 파일에는 쓰지 않는다.
 */
public record BusinessCardEntry(
        long id,
        String name,
        LocalDate birthDate,
        String email,
        String snsHandle,
        List<EventActivityField> activityFields,
        String otherActivity,
        boolean noCareer,
        List<Career> careers,
        String intro,
        String photoFile,
        String photoKey,
        Instant createdAt
) {

    static BusinessCardEntry from(EventRegistration registration) {
        return new BusinessCardEntry(
                registration.getId(),
                registration.getName(),
                registration.getBirthDate(),
                registration.getEmail(),
                registration.getSnsHandle(),
                registration.getActivityFields().stream().sorted().toList(),
                registration.getOtherActivity(),
                registration.isNoCareer(),
                registration.getCareers().stream().map(Career::from).toList(),
                registration.getIntro(),
                null,
                registration.getPhotoKey(),
                registration.getCreatedAt()
        );
    }

    BusinessCardEntry withPhotoFile(String file) {
        return new BusinessCardEntry(id, name, birthDate, email, snsHandle, activityFields, otherActivity, noCareer,
                careers, intro, file, photoKey, createdAt);
    }
}
