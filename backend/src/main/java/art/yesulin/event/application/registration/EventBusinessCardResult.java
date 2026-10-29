package art.yesulin.event.application.registration;

/** 운영자에게만 주는 명함 연결 정보. 회원 연결과 공개 프로필 목적지는 별개다. */
public record EventBusinessCardResult(String publicId, String url, String profileUrl, Long memberId) {
}
