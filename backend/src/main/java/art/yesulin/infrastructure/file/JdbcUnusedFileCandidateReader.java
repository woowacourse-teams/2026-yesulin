package art.yesulin.infrastructure.file;

import art.yesulin.application.file.report.UnusedFileCandidate;
import art.yesulin.application.file.report.UnusedFileCandidateReader;
import art.yesulin.application.file.report.UnusedFileCursor;
import art.yesulin.domain.file.FileStatus;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class JdbcUnusedFileCandidateReader implements UnusedFileCandidateReader {

    private static final int MAX_PAGE_SIZE = 500;
    private static final String QUERY = """
            select f.id, f.status, f.created_at
            from file_assets f
            where f.created_at <= ?
              and f.status in ('PENDING', 'READY')
              and not exists (select 1 from file_references r where r.file_id = f.id)
              and not exists (select 1 from performances p where p.poster_file_id = f.id)
              and not exists (
                  select 1 from photo_library_items pli
                  where pli.file_id = f.id and pli.deleted_at is null
              )
              and not exists (
                  select 1 from submission_photo_requirement_answers spa where spa.file_id = f.id
              )
              and not exists (select 1 from submissions s where s.poster_file_id = f.id)
              and not exists (select 1 from otr_submission_photos osp where osp.file_id = f.id)
              and not exists (select 1 from shows sh where sh.poster_file_id = f.id)
              and not exists (select 1 from show_images shi where shi.file_id = f.id)
            """;
    private static final String AFTER = """
              and (f.created_at > ? or (f.created_at = ? and f.id > ?))
            """;
    private static final String ORDER_AND_LIMIT = "order by f.created_at, f.id limit ?";

    private final JdbcTemplate jdbcTemplate;

    @Override
    public List<UnusedFileCandidate> readPage(Instant cutoff, Optional<UnusedFileCursor> after, int limit) {
        if (limit < 1 || limit > MAX_PAGE_SIZE) {
            throw new IllegalArgumentException("파일 조회 크기는 1~500이어야 합니다.");
        }
        if (after.isPresent()) {
            UnusedFileCursor cursor = after.orElseThrow();
            return jdbcTemplate.query(
                    QUERY + AFTER + ORDER_AND_LIMIT,
                    (resultSet, rowNum) -> candidateFrom(resultSet),
                    Timestamp.from(cutoff),
                    Timestamp.from(cursor.createdAt()),
                    Timestamp.from(cursor.createdAt()),
                    cursor.fileId(),
                    limit
            );
        }
        return jdbcTemplate.query(
                QUERY + ORDER_AND_LIMIT,
                (resultSet, rowNum) -> candidateFrom(resultSet),
                Timestamp.from(cutoff),
                limit
        );
    }

    private UnusedFileCandidate candidateFrom(java.sql.ResultSet resultSet) throws java.sql.SQLException {
        return new UnusedFileCandidate(
                resultSet.getLong("id"),
                FileStatus.valueOf(resultSet.getString("status")),
                resultSet.getTimestamp("created_at").toInstant()
        );
    }
}
