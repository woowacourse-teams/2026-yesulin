package art.yesulin.event.application.registration;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import art.yesulin.auth.application.memberlink.MemberLinkCodeService;
import art.yesulin.event.domain.Event;
import art.yesulin.event.domain.EventRepository;
import art.yesulin.event.domain.registration.EventRegistration;
import art.yesulin.event.domain.registration.EventRegistrationRepository;
import art.yesulin.event.domain.registration.visit.EventBusinessCardVisitRepository;
import art.yesulin.global.audit.AdminAuditLogRepository;
import java.time.Clock;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

class EventBusinessCardServiceTest {

    @Test
    void visitLocksEventBeforeRegistrationToMatchDeletionOrder() {
        EventRegistrationRepository registrations = mock(EventRegistrationRepository.class);
        EventRepository events = mock(EventRepository.class);
        EventBusinessCardVisitRepository visits = mock(EventBusinessCardVisitRepository.class);
        EventRegistration registration = mock(EventRegistration.class);
        String key = UUID.randomUUID().toString();
        when(registrations.findEventIdByBusinessCardKey(key)).thenReturn(Optional.of(1L));
        when(events.findByIdForUpdate(1L)).thenReturn(Optional.of(mock(Event.class)));
        when(registrations.findByBusinessCardKeyForUpdate(key)).thenReturn(Optional.of(registration));
        when(registration.getEventId()).thenReturn(1L);
        when(registration.getBusinessCardProfileUrl()).thenReturn("https://example.test/profile");
        EventBusinessCardService service = new EventBusinessCardService(registrations,
                mock(MemberLinkCodeService.class), mock(AdminAuditLogRepository.class), visits, events,
                Clock.systemUTC(), "https://dev.yesulin.art", "https://yesulin.art");

        assertEquals("https://example.test/profile", service.visit(key));

        InOrder locks = inOrder(events, registrations, visits);
        locks.verify(registrations).findEventIdByBusinessCardKey(key);
        locks.verify(events).findByIdForUpdate(1L);
        locks.verify(registrations).findByBusinessCardKeyForUpdate(key);
        locks.verify(visits).save(any());
    }
}
