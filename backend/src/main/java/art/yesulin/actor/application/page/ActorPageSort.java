package art.yesulin.actor.application.page;

import org.springframework.data.domain.Sort;

/** 배우 목록 정렬. 정렬을 더할 때 값과 정렬 기준만 늘리고 목록 응답 형태는 바꾸지 않는다. */
public enum ActorPageSort {

    /** 공개로 바꾼 시각과 공개 내용이 마지막으로 바뀐 시각 중 늦은 값이 최근인 순. 같으면 나중에 만든 페이지가 앞이다. */
    RECENT("recent", Sort.by(Sort.Order.desc("lastPublicActivityAt"), Sort.Order.desc("id")));

    private final String value;
    private final Sort sort;

    ActorPageSort(String value, Sort sort) {
        this.value = value;
        this.sort = sort;
    }

    public static ActorPageSort from(String value) {
        for (ActorPageSort candidate : values()) {
            if (candidate.value.equals(value)) {
                return candidate;
            }
        }
        throw new IllegalArgumentException("배우 목록 정렬은 recent여야 합니다.");
    }

    public Sort sort() {
        return sort;
    }
}
