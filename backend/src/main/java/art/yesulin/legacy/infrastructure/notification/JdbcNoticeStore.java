package art.yesulin.legacy.infrastructure.notification;

import art.yesulin.legacy.application.auditionnotice.NoticeScope;
import art.yesulin.legacy.application.auditionnotice.NoticeStore;
import art.yesulin.legacy.application.auditionnotice.SmsGateway;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class JdbcNoticeStore implements NoticeStore {

    private final JdbcTemplate jdbc;

    @Override
    public void lock() {
        jdbc.queryForObject("SELECT id FROM audition_sms_lock WHERE id = 1 FOR UPDATE", Long.class);
    }

    @Override
    public Optional<Batch> byKey(long ownerId, UUID key) {
        return jdbc.query("SELECT * FROM audition_sms_batches WHERE owner_id=? AND idempotency_key=?",
                this::mapBatch, ownerId, key.toString()).stream().findFirst();
    }

    @Override
    public Optional<Batch> batch(UUID id) {
        return jdbc.query("SELECT * FROM audition_sms_batches WHERE id=?", this::mapBatch, id.toString())
                .stream().findFirst();
    }

    @Override
    public List<Batch> batches(long ownerId, NoticeScope scope, int round) {
        return jdbc.query("""
                SELECT * FROM audition_sms_batches WHERE owner_id=? AND role_id=? AND source_round=? AND scope_key=?
                ORDER BY created_at DESC LIMIT 100
                """, this::mapBatch, ownerId, scope.roleId(), round, scope.key());
    }

    @Override
    public List<Delivery> deliveries(UUID batchId) {
        return jdbc.query("SELECT * FROM audition_sms_deliveries WHERE batch_id=? ORDER BY id",
                this::mapDelivery, batchId.toString());
    }

    @Override
    public List<HistoryItem> history(long ownerId, NoticeScope scope, int round) {
        return jdbc.query("""
                SELECT b.*, MIN(d.recipient_name) AS first_name, COUNT(d.id) AS retained_count,
                SUM(CASE WHEN d.status='DELIVERED' THEN 1 ELSE 0 END) AS delivered_count,
                SUM(CASE WHEN d.status='FAILED' THEN 1 ELSE 0 END) AS failed_count,
                SUM(CASE WHEN d.status IN ('QUEUED','SENDING','ACCEPTED') THEN 1 ELSE 0 END) AS pending_count,
                SUM(CASE WHEN d.status='UNKNOWN' THEN 1 ELSE 0 END) AS unknown_count,
                CASE WHEN COUNT(DISTINCT d.message_type)>1 THEN 'SMS/LMS'
                     ELSE MIN(d.message_type) END AS message_type
                FROM (SELECT * FROM audition_sms_batches WHERE owner_id=? AND role_id=? AND source_round=? AND scope_key=?
                      ORDER BY created_at DESC,id DESC LIMIT 100) b
                LEFT JOIN audition_sms_deliveries d ON d.batch_id=b.id
                GROUP BY b.id,b.owner_id,b.role_id,b.source_round,b.source_stage_id,b.target_stage_id,
                         b.idempotency_key,b.fingerprint,b.sender,b.created_at,b.retry_of,b.estimated_cost,
                         b.recipient_count,b.scope_key
                ORDER BY b.created_at DESC,b.id DESC
                """, (rs, row) -> new HistoryItem(mapBatch(rs, row), rs.getString("first_name"),
                rs.getInt("retained_count"), rs.getInt("delivered_count"), rs.getInt("failed_count"),
                rs.getInt("pending_count"), rs.getInt("unknown_count"), rs.getString("message_type")),
                ownerId, scope.roleId(), round, scope.key());
    }

    @Override
    public void insert(Batch b, List<Delivery> deliveries) {
        jdbc.update("""
                INSERT INTO audition_sms_batches
                (id,owner_id,role_id,source_round,source_stage_id,target_stage_id,idempotency_key,fingerprint,
                sender,created_at,retry_of,estimated_cost,recipient_count,scope_key) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """, b.id().toString(), b.ownerId(), b.roleId(), b.sourceRound(), b.sourceStageId(), b.targetStageId(),
                b.idempotencyKey().toString(), b.fingerprint(), b.sender(), Timestamp.from(b.createdAt()),
                b.retryOf() == null ? null : b.retryOf().toString(), b.estimatedCost(), b.count(), b.scopeKey());
        for (Delivery d : deliveries) {
            jdbc.update("""
                    INSERT INTO audition_sms_deliveries
                    (id,batch_id,submission_id,recipient_name,phone,appointment,body,message_type,price,status,
                    updated_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,'QUEUED',?,?)
                    """, d.id().toString(), b.id().toString(), d.submissionId().toString(), d.name(), d.phone(),
                    Timestamp.valueOf(d.appointment()), d.body(), d.type(), d.price(),
                    Timestamp.from(b.createdAt()), Timestamp.from(b.createdAt()));
        }
    }

    @Override
    public int reserve(LocalDate day, int count, int limit) {
        List<Integer> existing = jdbc.query("SELECT reserved_count FROM audition_sms_daily_usage WHERE usage_day=?",
                (rs, row) -> rs.getInt(1), day);
        int current = existing.isEmpty() ? 0 : existing.getFirst();
        if ((long) current + count > limit) {
            return -1;
        }
        if (existing.isEmpty()) {
            jdbc.update("INSERT INTO audition_sms_daily_usage VALUES (?,?)", day, count);
        } else {
            jdbc.update("UPDATE audition_sms_daily_usage SET reserved_count=? WHERE usage_day=?", current + count, day);
        }
        return current + count;
    }

    @Override
    public Optional<Draft> draft(long ownerId, NoticeScope scope, int round) {
        return jdbc.query("""
                SELECT * FROM audition_sms_drafts WHERE owner_id=? AND role_id=? AND source_round=? AND scope_key=?
                """,
                (rs, row) -> new Draft(rs.getLong("version"), rs.getString("payload"),
                        rs.getTimestamp("updated_at").toInstant()), ownerId, scope.roleId(), round, scope.key())
                .stream().findFirst();
    }

    @Override
    public void saveDraft(long ownerId, NoticeScope scope, int round, Draft draft) {
        deleteDraft(ownerId, scope, round);
        jdbc.update("""
                INSERT INTO audition_sms_drafts
                (owner_id,role_id,source_round,scope_key,version,payload,updated_at) VALUES (?,?,?,?,?,?,?)
                """, ownerId, scope.roleId(), round, scope.key(),
                draft.version(), draft.payload(), Timestamp.from(draft.updatedAt()));
    }

    @Override
    public void deleteDraft(long ownerId, NoticeScope scope, int round) {
        jdbc.update("DELETE FROM audition_sms_drafts WHERE owner_id=? AND role_id=? AND source_round=? AND scope_key=?",
                ownerId, scope.roleId(), round, scope.key());
    }

    @Override
    public Optional<Delivery> claim(Instant now) {
        lock();
        List<Delivery> rows = jdbc.query("""
                SELECT * FROM audition_sms_deliveries WHERE status='QUEUED' ORDER BY created_at,id LIMIT 1
                """, this::mapDelivery);
        if (rows.isEmpty()) {
            return Optional.empty();
        }
        Delivery d = rows.getFirst();
        jdbc.update("UPDATE audition_sms_deliveries SET status='SENDING',updated_at=? WHERE id=? AND status='QUEUED'",
                Timestamp.from(now), d.id().toString());
        return Optional.of(d);
    }

    @Override
    public void outcome(UUID id, SmsGateway.Outcome result, Instant now) {
        jdbc.update("""
                UPDATE audition_sms_deliveries SET status=?,provider_id=COALESCE(?,provider_id),result_code=?,updated_at=?,
                lookup_count=lookup_count WHERE id=? AND status IN ('SENDING','ACCEPTED','UNKNOWN')
                """, result.status(), result.providerId(), result.code(), Timestamp.from(now), id.toString());
    }

    @Override
    public List<Delivery> pendingResults(Instant now) {
        lock();
        List<Delivery> pending = jdbc.query("""
                SELECT * FROM audition_sms_deliveries WHERE status IN ('ACCEPTED','UNKNOWN')
                AND provider_id IS NOT NULL AND lookup_count<100
                AND ((lookup_count<6 AND updated_at<?) OR (lookup_count>=6 AND updated_at<?))
                ORDER BY updated_at LIMIT 10
                """, this::mapDelivery, Timestamp.from(now.minusSeconds(10)),
                Timestamp.from(now.minusSeconds(900)));
        for (Delivery delivery : pending) {
            jdbc.update("UPDATE audition_sms_deliveries SET updated_at=?,lookup_count=lookup_count+1 WHERE id=?",
                    Timestamp.from(now), delivery.id().toString());
        }
        return pending;
    }

    @Override
    public void recover(Instant now) {
        jdbc.update("""
                UPDATE audition_sms_deliveries SET status='UNKNOWN',result_code='INTERRUPTED'
                WHERE status='SENDING' AND updated_at<?
                """, Timestamp.from(now.minusSeconds(120)));
    }

    @Override
    public void eraseSubmission(UUID submissionId) {
        lock();
        jdbc.update("DELETE FROM audition_sms_deliveries WHERE submission_id=?", submissionId.toString());
        jdbc.update("DELETE FROM audition_sms_drafts WHERE payload LIKE ?", "%" + submissionId + "%");
    }

    @Override
    public void expire(Instant before) {
        jdbc.update("DELETE FROM audition_sms_deliveries WHERE created_at<?", Timestamp.from(before));
        jdbc.update("DELETE FROM audition_sms_drafts WHERE updated_at<?", Timestamp.from(before));
    }

    private Batch mapBatch(ResultSet rs, int row) throws SQLException {
        String retry = rs.getString("retry_of");
        return new Batch(UUID.fromString(rs.getString("id")), rs.getLong("owner_id"), rs.getLong("role_id"),
                rs.getInt("source_round"), rs.getObject("source_stage_id", Long.class),
                rs.getObject("target_stage_id", Long.class),
                UUID.fromString(rs.getString("idempotency_key")), rs.getString("fingerprint"), rs.getString("sender"),
                rs.getTimestamp("created_at").toInstant(), retry == null ? null : UUID.fromString(retry),
                rs.getBigDecimal("estimated_cost"), rs.getInt("recipient_count"), rs.getString("scope_key"));
    }

    @Override
    public void markRetried(List<UUID> ids) {
        for (UUID id : ids) {
            jdbc.update("UPDATE audition_sms_deliveries SET result_code='RETRIED' WHERE id=? AND status='FAILED'",
                    id.toString());
        }
    }

    private Delivery mapDelivery(ResultSet rs, int row) throws SQLException {
        return new Delivery(UUID.fromString(rs.getString("id")), UUID.fromString(rs.getString("batch_id")),
                UUID.fromString(rs.getString("submission_id")), rs.getString("recipient_name"), rs.getString("phone"),
                rs.getTimestamp("appointment").toLocalDateTime(), rs.getString("body"), rs.getString("message_type"),
                rs.getBigDecimal("price"), rs.getString("status"), rs.getString("provider_id"),
                rs.getString("result_code"),
                rs.getTimestamp("updated_at").toInstant());
    }
}
