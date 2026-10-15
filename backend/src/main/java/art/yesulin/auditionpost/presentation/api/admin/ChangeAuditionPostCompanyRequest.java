package art.yesulin.auditionpost.presentation.api.admin;

/**
 * 공고를 공연사에 연결하거나 연결을 끊는다.
 *
 * @param companyId 연결할 공연사 ID. null이면 연결을 끊는다.
 */
public record ChangeAuditionPostCompanyRequest(Long companyId) {
}
