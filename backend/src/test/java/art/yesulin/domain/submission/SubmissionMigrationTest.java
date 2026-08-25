package art.yesulin.domain.submission;

import static org.junit.jupiter.api.Assertions.assertThrows;

import art.yesulin.support.ObjectStorageTestConfiguration;
import java.nio.ByteBuffer;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:submission-migration;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
@Transactional
class SubmissionMigrationTest {

    private static final Instant SUBMITTED_AT = Instant.parse("2026-08-23T03:15:00Z");

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void validatesSubmissionSchemaCreatedByFlyway() {
    }

    @Test
    void rejectsDuplicatePublicId() {
        UUID publicId = UUID.fromString("b4472dce-52d0-41a9-baaa-c9e86e31b72b");
        insertSubmission(publicId, 1L, 1L);

        assertThrows(
                DataIntegrityViolationException.class,
                () -> insertSubmission(publicId, 2L, 2L)
        );
    }

    @Test
    void rejectsPhotoRequirementAnswerReferencingMissingFile() {
        UUID publicId = UUID.fromString("40cf23df-6e9a-4d71-a575-53a0193e8306");
        long submissionId = insertSubmission(publicId, 1L, 1L);

        assertThrows(
                DataIntegrityViolationException.class,
                () -> jdbcTemplate.update(
                        """
                                insert into submission_photo_requirement_answers
                                    (submission_id, answer_order, photo_requirement_id,
                                     requirement_description, file_id)
                                values (?, ?, ?, ?, ?)
                                """,
                        submissionId,
                        0,
                        1L,
                        "프로필 사진",
                        Long.MAX_VALUE
                )
        );
    }

    @Test
    void rejectsDuplicateSelectedRoleSnapshot() {
        UUID publicId = UUID.fromString("23deaf15-53de-47e2-b49e-1068f4fec24a");
        long submissionId = insertSubmission(publicId, 1L, 1L);
        insertSelectedRole(submissionId, 0, 10L);

        assertThrows(
                DataIntegrityViolationException.class,
                () -> insertSelectedRole(submissionId, 1, 10L)
        );
    }

    @Test
    void rejectsDuplicateBasicFieldSnapshot() {
        long submissionId = insertSubmission(UUID.randomUUID(), 1L, 1L);
        insertBasicField(submissionId, 0, "NAME");

        assertThrows(
                DataIntegrityViolationException.class,
                () -> insertBasicField(submissionId, 1, "NAME")
        );
    }

    @Test
    void rejectsDuplicateAdditionalFieldSnapshot() {
        long submissionId = insertSubmission(UUID.randomUUID(), 1L, 1L);
        insertAdditionalField(submissionId, 0, "CAREER");

        assertThrows(
                DataIntegrityViolationException.class,
                () -> insertAdditionalField(submissionId, 1, "CAREER")
        );
    }

    @Test
    void rejectsDuplicateQuestionSnapshot() {
        long submissionId = insertSubmission(UUID.randomUUID(), 1L, 1L);
        insertAnswer(submissionId, 0, 10L);

        assertThrows(
                DataIntegrityViolationException.class,
                () -> insertAnswer(submissionId, 1, 10L)
        );
    }

    @Test
    void rejectsDuplicatePhotoAssociationSnapshot() {
        long submissionId = insertSubmission(UUID.randomUUID(), 1L, 1L);
        long fileId = insertFile();
        insertPhotoRequirementAnswer(submissionId, 0, 10L, fileId);

        assertThrows(
                DataIntegrityViolationException.class,
                () -> insertPhotoRequirementAnswer(submissionId, 1, 10L, fileId)
        );
    }

    @Test
    void rejectsDuplicateVideoRequirementSnapshot() {
        long submissionId = insertSubmission(UUID.randomUUID(), 1L, 1L);
        insertVideoRequirementAnswer(submissionId, 0, 10L);

        assertThrows(
                DataIntegrityViolationException.class,
                () -> insertVideoRequirementAnswer(submissionId, 1, 10L)
        );
    }

    @Test
    void rejectsDuplicateConsentTypeForSubmission() {
        UUID publicId = UUID.randomUUID();
        insertSubmission(publicId, 1L, 1L);
        insertConsent(publicId, "PRIVACY_COLLECTION_AND_USE");

        assertThrows(
                DataIntegrityViolationException.class,
                () -> insertConsent(publicId, "PRIVACY_COLLECTION_AND_USE")
        );
    }

    @Test
    void rejectsConsentReferencingMissingSubmission() {
        assertThrows(
                DataIntegrityViolationException.class,
                () -> insertConsent(UUID.randomUUID(), "PRIVACY_COLLECTION_AND_USE")
        );
    }

    private long insertSubmission(UUID publicId, long applicantId, long auditionId) {
        byte[] publicIdBytes = toBytes(publicId);
        long posterFileId = insertFile();
        jdbcTemplate.update(
                """
                        insert into submissions
                            (public_id, applicant_id, audition_id, audition_public_id,
                             audition_title, performance_title, company_name,
                             poster_file_id, poster_owner_id, submitted_at,
                             basic_information_present, additional_information_present,
                             submission_field_snapshot_present, question_answers_present,
                             photo_requirement_answers_present, video_requirement_answers_present)
                        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                publicIdBytes,
                applicantId,
                auditionId,
                UUID.randomUUID().toString(),
                "지원서 테스트 공고",
                "지원서 테스트 공연",
                "테스트 극단",
                posterFileId,
                2L,
                Timestamp.from(SUBMITTED_AT),
                true,
                true,
                true,
                true,
                true,
                true
        );
        return jdbcTemplate.queryForObject(
                "select id from submissions where public_id = ?",
                Long.class,
                publicIdBytes
        );
    }

    private void insertSelectedRole(long submissionId, int order, long auditionRoleId) {
        jdbcTemplate.update(
                """
                        insert into submission_selected_roles
                            (submission_id, role_order, audition_role_id, role_name)
                        values (?, ?, ?, ?)
                        """,
                submissionId,
                order,
                auditionRoleId,
                "테스트 배역"
        );
    }

    private void insertBasicField(long submissionId, int order, String field) {
        jdbcTemplate.update(
                """
                        insert into submission_basic_fields (submission_id, field_order, field)
                        values (?, ?, ?)
                        """,
                submissionId,
                order,
                field
        );
    }

    private void insertAdditionalField(long submissionId, int order, String field) {
        jdbcTemplate.update(
                """
                        insert into submission_additional_fields (submission_id, field_order, field)
                        values (?, ?, ?)
                        """,
                submissionId,
                order,
                field
        );
    }

    private void insertAnswer(long submissionId, int order, long questionId) {
        jdbcTemplate.update(
                """
                        insert into submission_question_answers
                            (submission_id, answer_order, question_id, question, answer)
                        values (?, ?, ?, ?, ?)
                        """,
                submissionId,
                order,
                questionId,
                "지원 동기는?",
                "답변"
        );
    }

    private void insertPhotoRequirementAnswer(long submissionId, int order, long requirementId, long fileId) {
        jdbcTemplate.update(
                """
                        insert into submission_photo_requirement_answers
                            (submission_id, answer_order, photo_requirement_id,
                             requirement_description, file_id)
                        values (?, ?, ?, ?, ?)
                        """,
                submissionId,
                order,
                requirementId,
                "프로필 사진",
                fileId
        );
    }

    private void insertVideoRequirementAnswer(long submissionId, int order, long requirementId) {
        jdbcTemplate.update(
                """
                        insert into submission_video_requirement_answers
                            (submission_id, answer_order, video_requirement_id,
                             requirement_description, url)
                        values (?, ?, ?, ?, ?)
                        """,
                submissionId,
                order,
                requirementId,
                "자유 연기",
                "https://youtu.be/abcdefghijk"
        );
    }

    private void insertConsent(UUID submissionId, String consentType) {
        jdbcTemplate.update(
                """
                        insert into submission_consents
                            (submission_id, applicant_id, consent_type, document_version,
                             recipient_name_snapshot, agreed_at)
                        values (?, ?, ?, ?, ?, ?)
                        """,
                toBytes(submissionId),
                1L,
                consentType,
                "test-v1",
                null,
                Timestamp.from(SUBMITTED_AT)
        );
    }

    private long insertFile() {
        String objectKey = "files/submission-migration/" + UUID.randomUUID() + ".jpg";
        jdbcTemplate.update(
                """
                        insert into file_assets
                            (object_key, owner_id, original_filename, content_type, file_type, size, status)
                        values (?, ?, ?, ?, ?, ?, ?)
                        """,
                objectKey,
                1L,
                "profile.jpg",
                "image/jpeg",
                "IMAGE",
                1_024L,
                "READY"
        );
        return jdbcTemplate.queryForObject(
                "select id from file_assets where object_key = ?",
                Long.class,
                objectKey
        );
    }

    private byte[] toBytes(UUID value) {
        return ByteBuffer.allocate(Long.BYTES * 2)
                .putLong(value.getMostSignificantBits())
                .putLong(value.getLeastSignificantBits())
                .array();
    }
}
