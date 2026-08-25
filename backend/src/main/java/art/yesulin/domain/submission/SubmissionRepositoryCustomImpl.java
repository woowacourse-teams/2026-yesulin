package art.yesulin.domain.submission;

import art.yesulin.domain.audition.QAudition;
import art.yesulin.domain.performance.QPerformance;
import art.yesulin.domain.producer.QProducer;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.NumberPath;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.util.List;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class SubmissionRepositoryCustomImpl implements SubmissionRepositoryCustom {

    private static final QSubmission SUBMISSION = QSubmission.submission;
    private static final QSelectedRole SELECTED_ROLE = new QSelectedRole("screeningSelectedRole");
    private static final QAudition AUDITION = QAudition.audition;
    private static final QPerformance PERFORMANCE = QPerformance.performance;
    private static final QProducer PRODUCER = QProducer.producer;

    private final JPAQueryFactory queryFactory;

    @Override
    public List<Submission> findAllForScreening(
            long auditionId,
            long roleId,
            ScreeningSubmissionSearchCondition condition
    ) {
        BooleanBuilder filters = new BooleanBuilder()
                .and(SUBMISSION.auditionSnapshot.auditionId.eq(auditionId))
                .and(SELECTED_ROLE.auditionRoleId.eq(roleId));
        appendKeyword(filters, condition.keyword());
        appendGenders(filters, condition.genders());
        appendNumeric(filters, SUBMISSION.applicantSnapshot.ageAtRecruitmentDeadline, condition.age());
        appendNumeric(filters, SUBMISSION.applicantSnapshot.basicInformation.height, condition.height());
        appendNumeric(filters, SUBMISSION.applicantSnapshot.basicInformation.weight, condition.weight());
        return queryFactory.selectDistinct(SUBMISSION)
                .from(SUBMISSION)
                .join(SUBMISSION.selectedRoles.values, SELECTED_ROLE)
                .where(filters)
                .orderBy(SUBMISSION.submittedAt.asc(), SUBMISSION.id.asc())
                .fetch();
    }

    /**
     * 목록 화면이 필요로 하는 공고·공연·기획사 값을 한 번에 읽는다. 제출 이력은 배우의 기록이므로
     * 공고나 공연을 더 이상 찾을 수 없어도 목록에서 빠지지 않도록 모두 left join으로 잇는다.
     */
    @Override
    public List<SubmissionSummaryRow> findSummaryRowsByApplicantId(long applicantId) {
        return queryFactory.select(Projections.constructor(
                        SubmissionSummaryRow.class,
                        SUBMISSION.id,
                        SUBMISSION.submissionId,
                        AUDITION.publicId,
                        SUBMISSION.auditionSnapshot.title,
                        PERFORMANCE.title,
                        PRODUCER.companyName,
                        PERFORMANCE.ownerId,
                        PERFORMANCE.posterFileId,
                        SUBMISSION.submittedAt
                ))
                .from(SUBMISSION)
                .leftJoin(AUDITION).on(AUDITION.id.eq(SUBMISSION.auditionSnapshot.auditionId))
                .leftJoin(PERFORMANCE).on(PERFORMANCE.id.eq(AUDITION.performanceId))
                .leftJoin(PRODUCER).on(PRODUCER.memberId.eq(AUDITION.ownerId))
                .where(SUBMISSION.applicantId.eq(applicantId))
                .orderBy(SUBMISSION.submittedAt.desc(), SUBMISSION.id.desc())
                .fetch();
    }

    private void appendKeyword(BooleanBuilder filters, String keyword) {
        if (keyword.isEmpty()) {
            return;
        }
        filters.and(
                SUBMISSION.applicantSnapshot.basicInformation.name.containsIgnoreCase(keyword)
                        .or(SUBMISSION.applicantSnapshot.additionalInformation.school.containsIgnoreCase(keyword))
                        .or(SUBMISSION.applicantSnapshot.basicInformation.phone.containsIgnoreCase(keyword))
                        .or(SUBMISSION.applicantSnapshot.basicInformation.email.containsIgnoreCase(keyword))
                        .or(SELECTED_ROLE.roleName.containsIgnoreCase(keyword))
        );
    }

    private void appendGenders(BooleanBuilder filters, List<String> genders) {
        if (!genders.isEmpty()) {
            filters.and(SUBMISSION.applicantSnapshot.basicInformation.gender.stringValue().in(genders));
        }
    }

    private void appendNumeric(
            BooleanBuilder filters,
            NumberPath<Integer> path,
            ScreeningSubmissionSearchCondition.NumericCondition condition
    ) {
        if (condition == null) {
            return;
        }
        filters.and("LTE".equals(condition.operator()) ? path.loe(condition.value()) : path.goe(condition.value()));
    }
}
