package art.yesulin.auditionpost.infrastructure.persistence;

import static art.yesulin.auditionpost.domain.QAuditionPost.auditionPost;
import static art.yesulin.auditionpost.domain.notice.QNotice.notice;

import art.yesulin.auditionpost.domain.alertchat.OpenChatPostVisits;
import art.yesulin.auditionpost.domain.alertchat.OpenChatVisitQuery;
import art.yesulin.auditionpost.domain.alertchat.OpenChatVisitTotals;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.core.types.dsl.NumberExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class QueryDslOpenChatVisitQuery implements OpenChatVisitQuery {

    private final JPAQueryFactory query;

    @Override
    public List<OpenChatPostVisits> findPosts(Pageable pageable, LocalDate startDate, LocalDate endDate) {
        return query.select(Projections.constructor(OpenChatPostVisits.class,
                        auditionPost.id, auditionPost.content.title, auditionPost.status,
                        auditionPost.content.sourcePostedAt,
                        visits()))
                .from(auditionPost)
                .leftJoin(notice).on(notice.source.eq(auditionPost.source)
                        .and(notice.externalId.eq(auditionPost.externalId)))
                .where(postedBetween(startDate, endDate))
                .orderBy(visits().desc(), auditionPost.id.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();
    }

    @Override
    public OpenChatVisitTotals summarize(LocalDate startDate, LocalDate endDate) {
        return query.select(Projections.constructor(OpenChatVisitTotals.class,
                        auditionPost.id.count(), visits().sumLong().coalesce(0L)))
                .from(auditionPost)
                .leftJoin(notice).on(notice.source.eq(auditionPost.source)
                        .and(notice.externalId.eq(auditionPost.externalId)))
                .where(postedBetween(startDate, endDate))
                .fetchOne();
    }

    private NumberExpression<Long> visits() {
        return auditionPost.openChatVisitCount.add(notice.openChatVisitCount.coalesce(0L));
    }

    private BooleanExpression postedBetween(LocalDate startDate, LocalDate endDate) {
        if (startDate == null) {
            return null;
        }
        return auditionPost.content.sourcePostedAt.goe(startDate.atStartOfDay())
                .and(auditionPost.content.sourcePostedAt.lt(endDate.plusDays(1).atStartOfDay()));
    }
}
