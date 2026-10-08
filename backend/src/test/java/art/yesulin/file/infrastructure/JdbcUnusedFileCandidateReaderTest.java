package art.yesulin.file.infrastructure;

import static org.junit.jupiter.api.Assertions.assertEquals;

import art.yesulin.file.application.report.UnusedFileCandidate;
import art.yesulin.file.domain.FileStatus;
import art.yesulin.support.ObjectStorageTestConfiguration;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:unused-file-candidates;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=validate"
})
@Import(ObjectStorageTestConfiguration.class)
@Transactional
class JdbcUnusedFileCandidateReaderTest {

    private static final Instant CUTOFF = Instant.parse("2026-09-21T00:00:00Z");
    private static final Instant OLD = Instant.parse("2026-09-20T00:00:00Z");

    @Autowired
    private JdbcUnusedFileCandidateReader reader;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void readsRecentAndOldUnusedFilesInStablePages() {
        insertFile(201L, "PENDING", OLD);
        insertFile(202L, "READY", OLD);
        insertFile(203L, "PENDING", CUTOFF.plusNanos(1_000));
        insertFile(204L, "READY", OLD);
        insertFile(205L, "READY", OLD);
        insertFile(206L, "READY", OLD);
        insertFile(207L, "READY", CUTOFF);
        jdbcTemplate.update("""
                insert into file_references (file_id, reference_type, reference_id)
                values (204, 'SUBMISSION_PHOTO', 99)
                """);
        jdbcTemplate.update("""
                insert into performances (owner_id, poster_file_id, title)
                values (1, 205, '공연')
                """);
        jdbcTemplate.update("insert into photo_libraries (id, owner_id) values (901, 1)");
        jdbcTemplate.update("""
                insert into photo_library_items (photo_library_id, file_id, display_order)
                values (901, 206, 0)
                """);

        List<UnusedFileCandidate> first = reader.readPage(Optional.empty(), 0, 2);
        List<UnusedFileCandidate> second = reader.readPage(Optional.empty(), 1, 2);

        assertEquals(List.of(201L, 202L), first.stream().limit(2).map(UnusedFileCandidate::fileId).toList());
        assertEquals(List.of(207L, 203L), second.stream().map(UnusedFileCandidate::fileId).toList());
    }

    @Test
    void treatsSoftDeletedLibraryPhotoAsUnused() {
        insertFile(208L, "READY", OLD);
        jdbcTemplate.update("insert into photo_libraries (id, owner_id) values (902, 2)");
        jdbcTemplate.update("""
                insert into photo_library_items (photo_library_id, file_id, display_order, deleted_at)
                values (902, 208, 0, current_timestamp)
                """);

        List<UnusedFileCandidate> candidates = reader.readPage(Optional.of(FileStatus.READY), 0, 10);

        assertEquals(List.of(208L), candidates.stream().map(UnusedFileCandidate::fileId).toList());
    }

    @Test
    void readyFileUsesLastUnlinkTimeInsteadOfCreationTime() {
        insertFile(209L, "READY", OLD);
        jdbcTemplate.update("update file_assets set unreferenced_at = ? where id = ?",
                Timestamp.from(CUTOFF.plusSeconds(86_400)), 209L);

        UnusedFileCandidate candidate = reader.findById(209L).orElseThrow();

        assertEquals(CUTOFF.plusSeconds(86_400), candidate.unusedSince());
    }

    private void insertFile(long id, String status, Instant createdAt) {
        jdbcTemplate.update("""
                insert into file_assets
                    (id, object_key, owner_id, original_filename, content_type, file_type, size,
                     status, created_at, unreferenced_at)
                values (?, ?, 1, 'photo.png', 'image/png', 'IMAGE', 10, ?, ?, ?)
                """, id, "public/files/20260920/" + id, status, Timestamp.from(createdAt),
                status.equals("READY") ? Timestamp.from(createdAt) : null);
    }
}
