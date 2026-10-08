package art.yesulin.file.infrastructure;

import art.yesulin.file.application.report.UnusedFileCandidate;
import art.yesulin.file.application.report.UnusedFileCandidateReader;
import art.yesulin.file.domain.FileStatus;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class JdbcUnusedFileCandidateReader implements UnusedFileCandidateReader {

    private static final String QUERY = """
            select f.id, f.owner_id, f.status, f.created_at,
                case when f.status = 'PENDING' then f.created_at
                     else coalesce(f.unreferenced_at, f.created_at) end as unused_since,
                case when f.object_key like 'private/%' then 'PRIVATE' else 'PUBLIC' end as storage_scope
            from file_assets f
            where f.status in ('PENDING', 'READY', 'DELETING')
              and (f.status <> 'READY' or f.unreferenced_at is not null)
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
    private static final String ORDER_AND_LIMIT = " order by unused_since, f.id limit ? offset ?";

    private final JdbcTemplate jdbcTemplate;

    @Override
    public List<UnusedFileCandidate> readPage(Optional<FileStatus> status, int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new IllegalArgumentException("페이지는 0 이상, 크기는 1~100이어야 합니다.");
        }
        int offset = Math.multiplyExact(page, size);
        if (status.isPresent()) {
            return jdbcTemplate.query(QUERY + " and f.status = ?" + ORDER_AND_LIMIT,
                    this::candidateFrom, status.orElseThrow().name(), size + 1, offset);
        }
        return jdbcTemplate.query(QUERY + ORDER_AND_LIMIT, this::candidateFrom, size + 1, offset);
    }

    @Override
    public Optional<UnusedFileCandidate> findById(long fileId) {
        return jdbcTemplate.query(QUERY + " and f.id = ?", this::candidateFrom, fileId).stream().findFirst();
    }

    private UnusedFileCandidate candidateFrom(ResultSet resultSet, int rowNumber) throws SQLException {
        return new UnusedFileCandidate(
                resultSet.getLong("id"),
                resultSet.getLong("owner_id"),
                FileStatus.valueOf(resultSet.getString("status")),
                resultSet.getTimestamp("created_at").toInstant(),
                resultSet.getTimestamp("unused_since").toInstant(),
                resultSet.getString("storage_scope")
        );
    }
}
