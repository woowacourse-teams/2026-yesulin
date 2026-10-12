package art.yesulin.auditionpost.presentation.api.admin;

/**
 * 공고를 기획사 계정에 연결하거나 연결을 끊는다.
 *
 * @param ownerId 연결할 기획사 회원 ID. null이면 연결을 끊는다.
 */
public record ChangeAuditionPostOwnerRequest(Long ownerId) {
}
