package art.yesulin.domain.admin.query;

import art.yesulin.application.auth.social.SocialProvider;
import art.yesulin.domain.audition.AuditionStatus;
import art.yesulin.domain.audition.QAudition;
import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import art.yesulin.domain.member.QMember;
import art.yesulin.domain.otraudition.QOtrAudition;
import art.yesulin.domain.otraudition.QOtrSubmission;
import art.yesulin.domain.performance.QPerformance;
import art.yesulin.domain.producer.QProducer;
import art.yesulin.domain.reservation.QReservation;
import art.yesulin.domain.reservation.ReservationStatus;
import art.yesulin.domain.show.QShow;
import art.yesulin.domain.show.QShowSession;
import art.yesulin.domain.show.ShowStatus;
import art.yesulin.domain.social.QSocialAccount;
import art.yesulin.domain.submission.QSubmission;
import com.querydsl.core.Tuple;
import com.querydsl.core.types.Expression;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.core.types.dsl.NumberExpression;
import com.querydsl.jpa.JPAExpressions;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
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
    private static final QShow SHOW = QShow.show;
    private static final QShowSession SESSION = QShowSession.showSession;
    private static final QReservation RESERVATION = QReservation.reservation;
    private static final QOtrAudition OTR_AUDITION = QOtrAudition.otrAudition;
    private static final QOtrSubmission OTR_SUBMISSION = QOtrSubmission.otrSubmission;
    private static final QSocialAccount SOCIAL_ACCOUNT = QSocialAccount.socialAccount;
    /** 회차 집계 select 목록에서 합계 컬럼의 위치다. */
    private static final int RESERVED_TICKETS_INDEX = 4;
    private static final int RESERVATION_COUNT_INDEX = 5;
    private static final int CANCELED_COUNT_INDEX = 6;

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
                countSubmissions(weekAgo),
                count(queryFactory.select(OTR_AUDITION.count()).from(OTR_AUDITION)),
                countOtrSubmissions(null),
                countOtrSubmissions(weekAgo),
                countShows(null),
                countShows(ShowStatus.OPEN),
                sumConfirmedTickets(),
                countConfirmedReservations(weekAgo)
        );
    }

    public AdminMemberStats findMemberStats(Instant todayStart, Instant weekAgo, Instant monthAgo) {
        long applicants = countMembers(MEMBER.type.eq(MemberType.APPLICANT));
        long producers = countMembers(MEMBER.type.eq(MemberType.PRODUCER));
        long applicantsWithSocialAccount = count(queryFactory
                .select(SOCIAL_ACCOUNT.memberId.countDistinct())
                .from(SOCIAL_ACCOUNT)
                .join(MEMBER).on(MEMBER.id.eq(SOCIAL_ACCOUNT.memberId))
                .where(MEMBER.type.eq(MemberType.APPLICANT)));
        AdminSignupMethods signupMethods = new AdminSignupMethods(
                countApplicantsWithProvider(SocialProvider.KAKAO),
                countApplicantsWithProvider(SocialProvider.NAVER),
                countApplicantsWithProvider(SocialProvider.GOOGLE),
                producers,
                Math.max(0L, applicants - applicantsWithSocialAccount)
        );
        return new AdminMemberStats(
                applicants,
                producers,
                signupMethods,
                countNewMembers(todayStart),
                countNewMembers(weekAgo),
                countNewMembers(monthAgo)
        );
    }

    /** 배우·기획사 가입 시각이다. 운영자 계정은 제외한다. */
    public List<AdminActivityEvent> findSignups(MemberType type, Instant from) {
        return single(queryFactory
                .select(MEMBER.createdAt)
                .from(MEMBER)
                .where(MEMBER.type.eq(type), MEMBER.createdAt.goe(from))
                .fetch());
    }

    public List<AdminActivityEvent> findSubmissions(Instant from) {
        return single(queryFactory
                .select(SUBMISSION.submittedAt)
                .from(SUBMISSION)
                .where(SUBMISSION.submittedAt.goe(from))
                .fetch());
    }

    public List<AdminActivityEvent> findOtrSubmissions(Instant from) {
        return single(queryFactory
                .select(OTR_SUBMISSION.submittedAt)
                .from(OTR_SUBMISSION)
                .where(OTR_SUBMISSION.submittedAt.goe(from))
                .fetch());
    }

    /** 현재 확정 상태인 예매의 생성 시각과 매수다. */
    public List<AdminActivityEvent> findConfirmedReservations(Instant from) {
        return queryFactory
                .select(RESERVATION.createdAt, RESERVATION.ticketCount)
                .from(RESERVATION)
                .where(RESERVATION.status.eq(ReservationStatus.CONFIRMED), RESERVATION.createdAt.goe(from))
                .fetch()
                .stream()
                .map(row -> new AdminActivityEvent(
                        row.get(RESERVATION.createdAt), row.get(RESERVATION.ticketCount).longValue()))
                .toList();
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

    public List<AdminAuditionRow> findAuditions(AuditionStatus status) {
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
                .fetch();
    }

    /** 무료 공연을 최근 생성 순으로, 회차는 시작 시각 순으로 예매 집계와 함께 반환한다. */
    public List<AdminShowRow> findShows(ShowStatus status) {
        BooleanExpression statusCondition = (status == null) ? null : SHOW.status.eq(status);
        List<Tuple> shows = queryFactory
                .select(SHOW.id, SHOW.publicId, SHOW.title, SHOW.status, PRODUCER.companyName, SHOW.createdAt)
                .from(SHOW)
                .leftJoin(PRODUCER).on(PRODUCER.memberId.eq(SHOW.ownerId))
                .where(statusCondition)
                .orderBy(SHOW.createdAt.desc(), SHOW.id.desc())
                .fetch();
        if (shows.isEmpty()) {
            return List.of();
        }

        Map<Long, List<AdminShowSessionRow>> sessionsByShowId = findSessionRows(
                shows.stream().map(show -> show.get(SHOW.id)).toList()
        );
        return shows.stream()
                .map(show -> AdminShowRow.of(
                        show.get(SHOW.publicId),
                        show.get(SHOW.title),
                        show.get(SHOW.status),
                        show.get(PRODUCER.companyName),
                        show.get(SHOW.createdAt),
                        sessionsByShowId.getOrDefault(show.get(SHOW.id), List.of())
                ))
                .toList();
    }

    /** 회차마다 예매를 한 번에 모아 센다. 예매가 없는 회차도 0으로 포함한다. */
    private Map<Long, List<AdminShowSessionRow>> findSessionRows(List<Long> showIds) {
        NumberExpression<Integer> confirmedTickets = new CaseBuilder()
                .when(RESERVATION.status.eq(ReservationStatus.CONFIRMED)).then(RESERVATION.ticketCount)
                .otherwise(0);
        NumberExpression<Integer> confirmed = new CaseBuilder()
                .when(RESERVATION.status.eq(ReservationStatus.CONFIRMED)).then(1)
                .otherwise(0);
        NumberExpression<Integer> canceled = new CaseBuilder()
                .when(RESERVATION.status.eq(ReservationStatus.CANCELED)).then(1)
                .otherwise(0);
        List<Tuple> rows = queryFactory
                .select(SESSION.showId, SESSION.id, SESSION.startsAt, SESSION.capacity,
                        confirmedTickets.sumLong(), confirmed.sumLong(), canceled.sumLong())
                .from(SESSION)
                .leftJoin(RESERVATION).on(RESERVATION.sessionId.eq(SESSION.id))
                .where(SESSION.showId.in(showIds))
                .groupBy(SESSION.showId, SESSION.id, SESSION.startsAt, SESSION.capacity)
                .orderBy(SESSION.startsAt.asc(), SESSION.id.asc())
                .fetch();
        return rows.stream().collect(Collectors.groupingBy(
                row -> row.get(SESSION.showId),
                Collectors.mapping(row -> new AdminShowSessionRow(
                        row.get(SESSION.id),
                        row.get(SESSION.startsAt),
                        row.get(SESSION.capacity),
                        longValue(row.get(RESERVED_TICKETS_INDEX, Number.class)),
                        longValue(row.get(RESERVATION_COUNT_INDEX, Number.class)),
                        longValue(row.get(CANCELED_COUNT_INDEX, Number.class))
                ), Collectors.toList())
        ));
    }

    /** SUM 결과 타입은 DB·Hibernate 버전마다 Integer나 Long으로 달라 숫자로 받아 변환한다. */
    private static long longValue(Number value) {
        return (value == null) ? 0L : value.longValue();
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

    private static List<AdminActivityEvent> single(List<Instant> occurredAt) {
        return occurredAt.stream().map(time -> new AdminActivityEvent(time, 1L)).toList();
    }

    private AdminNewMembers countNewMembers(Instant from) {
        return new AdminNewMembers(
                countMembers(MEMBER.type.eq(MemberType.APPLICANT).and(MEMBER.createdAt.goe(from))),
                countMembers(MEMBER.type.eq(MemberType.PRODUCER).and(MEMBER.createdAt.goe(from)))
        );
    }

    private long countApplicantsWithProvider(SocialProvider provider) {
        return count(queryFactory
                .select(SOCIAL_ACCOUNT.memberId.countDistinct())
                .from(SOCIAL_ACCOUNT)
                .join(MEMBER).on(MEMBER.id.eq(SOCIAL_ACCOUNT.memberId))
                .where(MEMBER.type.eq(MemberType.APPLICANT), SOCIAL_ACCOUNT.provider.eq(provider)));
    }

    private long countOtrSubmissions(Instant from) {
        BooleanExpression condition = (from == null) ? null : OTR_SUBMISSION.submittedAt.goe(from);
        return count(queryFactory.select(OTR_SUBMISSION.count()).from(OTR_SUBMISSION).where(condition));
    }

    private long countShows(ShowStatus status) {
        BooleanExpression condition = (status == null) ? null : SHOW.status.eq(status);
        return count(queryFactory.select(SHOW.count()).from(SHOW).where(condition));
    }

    private long sumConfirmedTickets() {
        return longValue(queryFactory
                .select(RESERVATION.ticketCount.sumLong())
                .from(RESERVATION)
                .where(RESERVATION.status.eq(ReservationStatus.CONFIRMED))
                .fetchOne());
    }

    private long countConfirmedReservations(Instant from) {
        return count(queryFactory
                .select(RESERVATION.count())
                .from(RESERVATION)
                .where(RESERVATION.status.eq(ReservationStatus.CONFIRMED), RESERVATION.createdAt.goe(from)));
    }

    private static long count(JPAQuery<Long> query) {
        Long count = query.fetchOne();
        return (count == null) ? 0L : count;
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
