package db.migration;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import org.flywaydb.core.api.MigrationVersion;
import org.flywaydb.core.api.migration.Context;
import org.flywaydb.core.api.migration.JavaMigration;
import tools.jackson.databind.json.JsonMapper;

/** 기존 항목은 삭제하지 않는다. 같은 심사의 동일 SHA 중 한 작업만 재접수의 대표로 지정한다. */
public class PdfSourceHashesMigration implements JavaMigration {

    @Override
    public MigrationVersion getVersion() {
        return MigrationVersion.fromVersion("20261030120100");
    }

    @Override
    public String getDescription() {
        return "backfill PDF source hashes";
    }

    @Override
    public Integer getChecksum() {
        return 1;
    }

    @Override
    public boolean canExecuteInTransaction() {
        return true;
    }

    @Override
    public void migrate(Context context) throws Exception {
        Connection connection = context.getConnection();
        JsonMapper mapper = JsonMapper.builder().build();
        String cursor = "";
        // 큰 JSON을 JPA persistence context나 JDBC 전체 결과에 쌓지 않고 한 행씩 읽는다.
        try (PreparedStatement next = connection.prepareStatement("""
                select job.id, job.review_id, payload.payload_json from pdf_extraction_jobs job
                join pdf_extraction_payloads payload on payload.job_id = job.id
                where job.id > ? and job.review_id is not null and job.source_sha256 is null
                and job.purpose = 'PDF_REVIEW' and job.deleted_at is null order by job.id limit 1
                """);
                PreparedStatement exists = connection.prepareStatement(
                        "select id from pdf_extraction_jobs where review_id = ? and source_sha256 = ?");
                PreparedStatement update = connection.prepareStatement(
                        "update pdf_extraction_jobs set source_sha256 = ? where id = ?")) {
            while (true) {
                next.setString(1, cursor);
                String reviewId;
                String sha256;
                try (ResultSet row = next.executeQuery()) {
                    if (!row.next()) {
                        return;
                    }
                    cursor = row.getString("id");
                    reviewId = row.getString("review_id");
                    sha256 = mapper.readTree(row.getString("payload_json")).path("sourceSha256").asText();
                }
                if (!sha256.matches("[0-9a-f]{64}")) {
                    continue;
                }
                exists.setString(1, reviewId);
                exists.setString(2, sha256);
                try (ResultSet found = exists.executeQuery()) {
                    if (found.next()) {
                        continue;
                    }
                }
                update.setString(1, sha256);
                update.setString(2, cursor);
                update.executeUpdate();
            }
        }
    }
}
