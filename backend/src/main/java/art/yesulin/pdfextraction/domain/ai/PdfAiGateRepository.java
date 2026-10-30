package art.yesulin.pdfextraction.domain.ai;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface PdfAiGateRepository extends JpaRepository<PdfAiGate, Integer> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select gate from PdfAiGate gate where gate.id = 1")
    Optional<PdfAiGate> lockCapacity();
}
