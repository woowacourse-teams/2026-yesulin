package art.yesulin.company.domain.editrequest;

/**
 * 수정 요청에서 요청자가 바꾼 항목. 요청자는 공개되지 않은 값을 볼 수 없으므로 운영자는 바꾼 항목만 요청 값으로 덮어쓴다.
 * 대표자 이름은 공개 동의, 주소는 상세 주소 공개 여부까지 함께 묶는다.
 */
public enum CompanyField {

    NAME,
    REPRESENTATIVE_NAME,
    LINKS,
    FOUNDED_ON,
    ADDRESS,
    REGION,
    PHONE,
    DESCRIPTION,
    HISTORY,
    PHOTO
}
