package art.yesulin.auditionpost.domain;

/** 같은 공개 상태·분야에서 전체 공고와 모집 중 공고를 한 번에 센 결과. */
public record AuditionPostCounts(long allCount, long openCount) {
}
