package art.yesulin.company.domain;

/**
 * 공연사 정보의 공개 상태. 운영자가 확인하기 전에는 공고에도, 공연사 화면에도 보이지 않는다.
 */
public enum CompanyStatus {

    /** 만들었거나 후보로 찾았지만 운영자가 아직 확인하지 않은 정보. 공개 상태를 다시 검토 전으로 돌리지는 않는다. */
    PENDING,
    PUBLISHED,
    /** 공개했다가 내린 정보. */
    HIDDEN
}
