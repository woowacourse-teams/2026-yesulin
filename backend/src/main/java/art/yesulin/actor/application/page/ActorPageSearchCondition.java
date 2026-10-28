package art.yesulin.actor.application.page;

import static art.yesulin.global.validation.DomainValidator.requireNonNull;

/** 배우 목록 조회 조건. 지금은 정렬만 있고, 성별·나이·키 같은 검색 조건은 여기에 더한다. */
public record ActorPageSearchCondition(ActorPageSort sort) {

    public ActorPageSearchCondition {
        sort = requireNonNull(sort, "배우 목록 정렬은 필수입니다.");
    }
}
