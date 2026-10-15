package art.yesulin.company.domain.editrequest;

/** 공연사 정보 수정 요청의 처리 상태. 운영자가 적용하거나 반려하면 끝난다. */
public enum CompanyEditRequestStatus {

    PENDING,
    APPLIED,
    REJECTED
}
