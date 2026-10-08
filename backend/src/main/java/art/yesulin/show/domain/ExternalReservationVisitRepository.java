package art.yesulin.show.domain;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ExternalReservationVisitRepository extends JpaRepository<ExternalReservationVisit, Long> {

    long countByShowId(long showId);

    void deleteByShowId(long showId);
}
