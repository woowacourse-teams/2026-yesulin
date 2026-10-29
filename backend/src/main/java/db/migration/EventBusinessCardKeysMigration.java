package db.migration;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.UUID;
import org.flywaydb.core.api.MigrationVersion;
import org.flywaydb.core.api.migration.Context;
import org.flywaydb.core.api.migration.JavaMigration;

/** MySQL과 H2에서 같은 UUID v4를 발급하며, 기존 목적지나 발급된 주소를 덮어쓰지 않는다. */
public class EventBusinessCardKeysMigration implements JavaMigration {

    @Override
    public MigrationVersion getVersion() {
        return MigrationVersion.fromVersion("20261029130100");
    }

    @Override
    public String getDescription() {
        return "backfill event business card keys";
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
        try (Statement query = context.getConnection().createStatement();
                ResultSet rows = query.executeQuery("select id from event_registrations "
                        + "where business_card_requested = true and business_card_key is null");
                PreparedStatement update = context.getConnection().prepareStatement(
                        "update event_registrations set business_card_key = ? where id = ?")) {
            while (rows.next()) {
                update.setString(1, UUID.randomUUID().toString());
                update.setLong(2, rows.getLong("id"));
                update.executeUpdate();
            }
        }
    }
}
