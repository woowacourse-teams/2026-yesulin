package art.yesulin.company.application.editrequest;

/** 공연사 정보 수정 요청이 저장됐다. 요청자 연락처는 담지 않는다. */
public record CompanyEditRequestedEvent(long requestId, long companyId, String companyName, String reason) {
}
