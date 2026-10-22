package art.yesulin.auditionpost.infrastructure.persistence;

import static art.yesulin.auditionpost.domain.QAuditionPost.auditionPost;
import static art.yesulin.auditionpost.domain.notice.QNotice.notice;

import art.yesulin.auditionpost.domain.alertchat.OpenChatPostVisits;
import art.yesulin.auditionpost.domain.alertchat.OpenChatVisitQuery;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class QueryDslOpenChatVisitQuery implements OpenChatVisitQuery {

    private final JPAQueryFactory query;

    @Override
    public List<OpenChatPostVisits> findPosts(Pageable pageable) {
        return query.select(Projections.constructor(OpenChatPostVisits.class,
                        auditionPost.id, auditionPost.content.title, auditionPost.status,
                        auditionPost.content.sourcePostedAt,
                        auditionPost.openChatVisitCount.add(notice.openChatVisitCount.coalesce(0L))))
                .from(auditionPost)
                .leftJoin(notice).on(notice.source.eq(auditionPost.source)
                        .and(notice.externalId.eq(auditionPost.externalId)))
                .orderBy(auditionPost.id.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();
    }

    @Override
    public long countPosts() {
        Long count = query.select(auditionPost.id.count()).from(auditionPost).fetchOne();
        return count == null ? 0 : count;
    }
}
