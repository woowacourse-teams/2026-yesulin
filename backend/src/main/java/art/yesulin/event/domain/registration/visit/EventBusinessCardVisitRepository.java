package art.yesulin.event.domain.registration.visit;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EventBusinessCardVisitRepository extends JpaRepository<EventBusinessCardVisit, Long> {

    @Query("""
            select visit.visitedOn as date, count(visit) as visits
            from EventBusinessCardVisit visit
            where visit.eventId = :eventId and visit.visitedOn between :start and :end
            group by visit.visitedOn order by visit.visitedOn
            """)
    List<Daily> daily(
            @Param("eventId") long eventId, @Param("start") LocalDate start, @Param("end") LocalDate end
    );

    interface Daily {

        LocalDate getDate();

        long getVisits();

    }
}
