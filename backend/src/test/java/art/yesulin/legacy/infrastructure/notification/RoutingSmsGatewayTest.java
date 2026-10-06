package art.yesulin.legacy.infrastructure.notification;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import art.yesulin.legacy.application.auditionnotice.SmsGateway;
import java.util.Map;
import org.junit.jupiter.api.Test;

class RoutingSmsGatewayTest {

    private final SmsGateway solapi = mock(SmsGateway.class);
    private final SmsGateway aligo = mock(SmsGateway.class);
    private final Map<String, SmsGateway> gateways = Map.of("solapi", solapi, "aligo", aligo);

    @Test
    void switchingProviderChangesOnlyNewSends() {
        when(solapi.send("02", "010", "안내", "SMS"))
                .thenReturn(new SmsGateway.Outcome("ACCEPTED", "M123", null));
        when(aligo.send("02", "010", "안내", "SMS"))
                .thenReturn(new SmsGateway.Outcome("ACCEPTED", "456", null));
        assertEquals("solapi:M123", new RoutingSmsGateway("solapi", gateways)
                .send("02", "010", "안내", "SMS").providerId());
        RoutingSmsGateway switched = new RoutingSmsGateway("aligo", gateways);
        assertEquals("aligo:456", switched.send("02", "010", "안내", "SMS").providerId());
        when(solapi.lookup("M123", "010")).thenReturn(new SmsGateway.Outcome("DELIVERED", "M123", "4000"));
        assertEquals(new SmsGateway.Outcome("DELIVERED", "solapi:M123", "4000"),
                switched.lookup("solapi:M123", "010"));
    }

    @Test
    void legacyAligoResultsRemainQueryableAfterSwitchingToSolapi() {
        when(aligo.lookup("123", "010")).thenReturn(new SmsGateway.Outcome("DELIVERED", "123", "DELIVERED"));
        RoutingSmsGateway gateway = new RoutingSmsGateway("solapi", gateways);
        assertEquals("123", gateway.lookup("123", "010").providerId());
        assertEquals("aligo:123", gateway.lookup("aligo:123", "010").providerId());
        verifyNoInteractions(solapi);
    }

    @Test
    void unknownSendDoesNotFallBackToAnotherProvider() {
        when(solapi.send("02", "010", "안내", "SMS")).thenReturn(SmsGateway.Outcome.unknown(null));
        assertEquals(SmsGateway.Outcome.unknown(null), new RoutingSmsGateway("solapi", gateways)
                .send("02", "010", "안내", "SMS"));
        verify(solapi).send("02", "010", "안내", "SMS");
        verifyNoInteractions(aligo);
    }

    @Test
    void invalidReferencesAndProviderDoNotGuessAnotherProvider() {
        RoutingSmsGateway gateway = new RoutingSmsGateway("solapi", gateways);
        assertEquals("UNKNOWN", gateway.lookup("other:123", "010").status());
        assertEquals("UNKNOWN", gateway.lookup("aligo:", "010").status());
        assertEquals("UNKNOWN", gateway.lookup("M123", "010").status());
        assertEquals("UNKNOWN", gateway.lookup(null, "010").status());
        assertThrows(IllegalArgumentException.class, () -> new RoutingSmsGateway("typo", gateways));
        verifyNoInteractions(solapi, aligo);
    }
}
