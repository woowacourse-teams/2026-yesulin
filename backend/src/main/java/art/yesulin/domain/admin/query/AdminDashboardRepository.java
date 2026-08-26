package art.yesulin.domain.admin.query;

import art.yesulin.domain.audition.AuditionStatus;
import art.yesulin.domain.audition.QAudition;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.domain.member.QMember;
import art.yesulin.domain.performance.QPerformance;
import art.yesulin.domain.producer.QProducer;
import art.yesulin.domain.submission.QSubmission;
import com.querydsl.core.types.Expression;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.core.types.dsl.NumberExpression;
import com.querydsl.jpa.JPAExpressions;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

/**
 * 운영 대시보드 전용 읽기 모델이다. aggregate의 쓰기 책임과 분리해 집계와 목록만 담당한다.
 */
@Repository
@RequiredArgsConstructor
public class AdminDashboardRepository {

    private static final QMember MEMBER = QMember.member;
    private static final QProducer PRODUCER = QProducer.producer;
    private static final QPerformance PERFORMANCE = QPerformance.performance;
    private static final QAudition AUDITION = QAudition.audition;
    private static final QSubmission SUBMISSION = QSubmission.submission;

    private final JPAQueryFactory queryFactory;

    public AdminOverview findOverview(Instant weekAgo) {
        return new AdminOverview(
                countMembers(MEMBER.type.eq(MemberType.APPLICANT)),
                countMembers(MEMBER.type.eq(MemberType.PRODUCER)),
                countMembers(MEMBER.type.eq(MemberType.PRODUCER).and(MEMBER.status.eq(MemberStatus.PENDING))),
                countMembers(MEMBER.type.eq(MemberType.PRODUCER).and(MEMBER.status.eq(MemberStatus.ACTIVE))),
                countPerformances(),
                countAuditions(null),
                countAuditions(AuditionStatus.DRAFT),
                countAuditions(AuditionStatus.PUBLISHED),
                countAuditions(AuditionStatus.CLOSED),
                countSubmissions(null),
                countMembers(MEMBER.type.eq(MemberType.PRODUCER).and(MEMBER.createdAt.goe(weekAgo))),
                countSubmissions(weekAgo)
        );
    }

    public List<AdminProducerRow> findProducers(MemberStatus status) {
        BooleanExpression statusCondition = (status == null) ? null : MEMBER.status.eq(status);
        return queryFactory
                .select(Projections.constructor(
                        AdminProducerRow.class,
                        MEMBER.id,
                        MEMBER.email,
                        MEMBER.status,
                        MEMBER.createdAt,
                        PRODUCER.companyName,
                        PRODUCER.contactName,
                        PRODUCER.contactRole,
                        PRODUCER.phone,
                        performanceCountOf(),
                        auditionCountOf()
                ))
                .from(MEMBER)
                .leftJoin(PRODUCER).on(PRODUCER.memberId.eq(MEMBER.id))
                .where(MEMBER.type.eq(MemberType.PRODUCER), statusCondition)
                .orderBy(pendingFirst().asc(), MEMBER.createdAt.desc())
                .fetch();
    }

    public List<AdminAuditionRow> findAuditions(AuditionStatus status, int limit) {
        BooleanExpression statusCondition = (status == null) ? null : AUDITION.status.eq(status);
        return queryFactory
                .select(Projections.constructor(
                        AdminAuditionRow.class,
                        AUDITION.publicId,
                        AUDITION.title,
                        AUDITION.status,
                        PRODUCER.companyName,
                        PERFORMANCE.title,
                        AUDITION.createdAt,
                        AUDITION.publishedAt,
                        submissionCountOf()
                ))
                .from(AUDITION)
                .leftJoin(PERFORMANCE).on(PERFORMANCE.id.eq(AUDITION.performanceId))
                .leftJoin(PRODUCER).on(PRODUCER.memberId.eq(AUDITION.ownerId))
                .where(statusCondition)
                .orderBy(AUDITION.createdAt.desc())
                .limit(limit)
                .fetch();
    }

    /** 승인 대기 계정이 목록 위로 오도록 정렬한다. 상태는 문자열로 저장돼 사전순 정렬이 의미와 다르다. */
    private NumberExpression<Integer> pendingFirst() {
        return new CaseBuilder()
                .when(MEMBER.status.eq(MemberStatus.PENDING)).then(0)
                .otherwise(1);
    }

    private Expression<Long> performanceCountOf() {
        return JPAExpressions.select(PERFORMANCE.count())
                .from(PERFORMANCE)
                .where(PERFORMANCE.ownerId.eq(MEMBER.id));
    }

    private Expression<Long> auditionCountOf() {
        return JPAExpressions.select(AUDITION.count())
                .from(AUDITION)
                .where(AUDITION.ownerId.eq(MEMBER.id));
    }

    private Expression<Long> submissionCountOf() {
        return JPAExpressions.select(SUBMISSION.count())
                .from(SUBMISSION)
                .where(SUBMISSION.auditionSnapshot.auditionId.eq(AUDITION.id));
    }

    private long countMembers(BooleanExpression condition) {
        Long count = queryFactory.select(MEMBER.count()).from(MEMBER).where(condition).fetchOne();
        return (count == null) ? 0L : count;
    }

    private long countPerformances() {
        Long count = queryFactory.select(PERFORMANCE.count()).from(PERFORMANCE).fetchOne();
        return (count == null) ? 0L : count;
    }

    private long countAuditions(AuditionStatus status) {
        BooleanExpression condition = (status == null) ? null : AUDITION.status.eq(status);
        Long count = queryFactory.select(AUDITION.count()).from(AUDITION).where(condition).fetchOne();
        return (count == null) ? 0L : count;
    }

    private long countSubmissions(Instant from) {
        BooleanExpression condition = (from == null) ? null : SUBMISSION.submittedAt.goe(from);
        Long count = queryFactory.select(SUBMISSION.count()).from(SUBMISSION).where(condition).fetchOne();
        return (count == null) ? 0L : count;
    }
}
