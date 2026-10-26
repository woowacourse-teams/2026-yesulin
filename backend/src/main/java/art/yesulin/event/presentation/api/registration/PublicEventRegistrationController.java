package art.yesulin.event.presentation.api.registration;

import art.yesulin.event.application.registration.EventRegistrationPhotoUploadResult;
import art.yesulin.event.application.registration.EventRegistrationService;
import art.yesulin.event.domain.registration.EventActivityField;
import art.yesulin.event.domain.registration.EventParticipantType;
import art.yesulin.event.domain.registration.EventRegistration;
import art.yesulin.event.domain.registration.EventRegistrationCareer;
import art.yesulin.event.domain.registration.EventRegistrationForm;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.EnumSet;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 로그인 없이 이벤트에 참가 신청한다. 배우는 먼저 프로필 사진을 비공개 경로로 올린 뒤 업로드 키와 함께 신청한다. */
@RestController
@RequestMapping("/api/v1/public/events/{eventId}/registrations")
@RequiredArgsConstructor
public class PublicEventRegistrationController {

    private final EventRegistrationService registrationService;

    @PostMapping
    public ResponseEntity<CreatedResponse> register(
            @PathVariable long eventId,
            @Valid @RequestBody RegisterRequest request
    ) {
        long id = registrationService.register(
                eventId, request.toForm(), request.photoUploadKey(), request.privacyAgreed()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(new CreatedResponse(id));
    }

    @PostMapping("/photo-uploads")
    public ResponseEntity<EventRegistrationPhotoUploadResult> preparePhotoUpload(
            @PathVariable long eventId,
            @Valid @RequestBody PreparePhotoUploadRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                registrationService.preparePhotoUpload(eventId, request.contentType(), request.size())
        );
    }

    /**
     * 참가 신청서. 구분에 맞지 않는 칸은 저장하지 않는다.
     *
     * @param businessCardRequested 배우가 프로필 명함 제작을 희망하는지. 켜면 아래 명함 정보가 필수다.
     * @param email 명함을 희망한 배우만 필수
     * @param birthDate 명함을 희망한 배우만 필수
     * @param affiliation 공연사 관계자만 필수인 소속과 지금 하는 일
     * @param photoUploadKey 명함을 희망한 배우가 올린 프로필 사진의 업로드 키
     * @param activityFields 명함을 희망한 배우가 활동하거나 준비하는 분야. 하나 이상 필수다.
     * @param otherActivity 기타 분야를 고른 배우가 직접 적은 분야
     * @param noCareer 신입이라 경력이 없는 배우
     * @param careers 배우 경력. 경력 없음이 아니면 한 줄 이상 필수다.
     */
    public record RegisterRequest(
            @NotNull EventParticipantType participantType,
            @NotBlank @Size(max = EventRegistration.MAX_NAME_LENGTH) String name,
            @NotBlank @Size(max = 20) String phone,
            boolean businessCardRequested,
            @Size(max = EventRegistration.MAX_EMAIL_LENGTH) String email,
            @Size(max = EventRegistration.MAX_SNS_HANDLE_LENGTH) String snsHandle,
            LocalDate birthDate,
            @Size(max = EventRegistration.MAX_AFFILIATION_LENGTH) String affiliation,
            @Size(max = 500) String photoUploadKey,
            @Size(max = 5) List<@NotNull EventActivityField> activityFields,
            @Size(max = EventRegistration.MAX_OTHER_ACTIVITY_LENGTH) String otherActivity,
            boolean noCareer,
            @Size(max = EventRegistration.MAX_CAREERS) List<@Valid @NotNull CareerRequest> careers,
            boolean privacyAgreed
    ) {

        EventRegistrationForm toForm() {
            boolean card = participantType == EventParticipantType.ACTOR && businessCardRequested;
            return new EventRegistrationForm(
                    participantType, name, phone, businessCardRequested, email, snsHandle, birthDate, affiliation,
                    activityFields == null || activityFields.isEmpty()
                            ? EnumSet.noneOf(EventActivityField.class)
                            : EnumSet.copyOf(activityFields),
                    otherActivity,
                    noCareer,
                    card && careers != null ? careers.stream().map(CareerRequest::toCareer).toList() : List.of()
            );
        }
    }

    /**
     * 경력 한 줄.
     *
     * @param performedMonth {@code YYYY-MM}
     * @param role 맡은 역. 비워 둘 수 있다.
     */
    public record CareerRequest(
            @NotBlank @Size(max = 7) String performedMonth,
            @NotBlank @Size(max = EventRegistrationCareer.MAX_WORK_TITLE_LENGTH) String workTitle,
            @Size(max = EventRegistrationCareer.MAX_ROLE_LENGTH) String role
    ) {

        EventRegistrationCareer toCareer() {
            return new EventRegistrationCareer(performedMonth, workTitle, role);
        }
    }

    /**
     * 프로필 사진을 올릴 자리를 만든다. 화면이 사진을 줄인 뒤의 형식과 크기다.
     *
     * @param contentType {@code image/jpeg}, {@code image/png}, {@code image/webp}
     */
    public record PreparePhotoUploadRequest(
            @NotBlank @Size(max = 100) String contentType,
            @Positive long size
    ) {
    }

    public record CreatedResponse(long id) {
    }
}
