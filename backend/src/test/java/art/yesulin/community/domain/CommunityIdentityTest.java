package art.yesulin.community.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import art.yesulin.global.exception.BusinessException;
import org.junit.jupiter.api.Test;

class CommunityIdentityTest {

    private static final String LEGACY = "a".repeat(64);
    private static final String OTHER = "b".repeat(64);

    @Test
    void createsIndependentServerKeysOnlyWhenRequested() {
        String created = CommunityIdentity.issue(null, null);
        assertTrue(created.matches("[a-f0-9]{64}"));
        assertNotEquals(created, CommunityIdentity.issue(null, null));
        assertFalse(CommunityIdentity.confirmed(null, null));
    }

    @Test
    void preservesLegacyOwnershipAndReusesEstablishedCookie() {
        String migrated = CommunityIdentity.issue(null, LEGACY);
        assertEquals(CommunityDigest.owner(LEGACY), CommunityDigest.owner(migrated));
        assertEquals(migrated, CommunityIdentity.issue(migrated, LEGACY));
        assertEquals(migrated, CommunityIdentity.issue(migrated, null));
        assertTrue(CommunityIdentity.confirmed(migrated, LEGACY));
    }

    @Test
    void neverConfirmsMissingOrDifferentCookieAndNeverReplacesOwnership() {
        assertFalse(CommunityIdentity.confirmed(null, LEGACY));
        assertFalse(CommunityIdentity.confirmed(OTHER, LEGACY));
        assertThrows(BusinessException.class, () -> CommunityIdentity.issue(OTHER, LEGACY));
    }

    @Test
    void rejectsInvalidMigrationAndCookieWithoutReflectingTheValue() {
        assertThrows(IllegalArgumentException.class, () -> CommunityIdentity.issue(null, "invalid"));
        assertThrows(IllegalArgumentException.class, () -> CommunityIdentity.issue("invalid", null));
        assertThrows(IllegalArgumentException.class, () -> CommunityIdentity.confirmed(LEGACY, "invalid"));
    }
}
