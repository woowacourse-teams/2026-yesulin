package art.yesulin.domain.auditionpost;

/** 가져온 공고의 공개 여부. 가져오는 즉시 공개하고, 운영자가 숨기면 공개 목록·상세에서 빠진다. */
public enum AuditionPostStatus {

    PUBLISHED,
    HIDDEN
}
