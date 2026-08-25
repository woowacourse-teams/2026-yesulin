package art.yesulin.domain.submission;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.dsl.NumberPath;
import com.querydsl.jpa.impl.JPAQueryFactory;
import java.util.List;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class SubmissionRepositoryCustomImpl implements SubmissionRepositoryCustom {

    private static final QSubmission SUBMISSION = QSubmission.submission;
    private static final QSelectedRole SELECTED_ROLE = new QSelectedRole("screeningSelectedRole");

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
