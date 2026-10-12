package art.yesulin.auditionpost.domain;

/** 공고를 처음 만든 경로. 다시 가져오거나 고쳐도 바뀌지 않는다. 마지막으로 가져온 운영자({@code imported_by})와는 다르다. */
public enum AuditionPostCreation {

    /** 운영 서버가 새 원문 공고 알림과 함께 자동으로 가져왔다. */
    AUTO_IMPORT,
    /** 운영자가 원문 번호로 가져왔다. */
    ADMIN_IMPORT,
    /** 운영자가 원문 없이 썼다. */
    ADMIN_WRITE,
    /** 기획사가 올렸다. */
    PRODUCER_WRITE
}
