package art.yesulin.auditionpost.domain;

/**
 * 가져온 공고의 공개 여부. 숨김으로 가져오고 운영자가 지원서를 준비한 뒤 공개한다. 숨긴 공고는 공개 목록에서 빠지고
 * 상세 주소는 원문 공고로 연결된다.
 */
public enum AuditionPostStatus {

    PUBLISHED,
    HIDDEN
}
