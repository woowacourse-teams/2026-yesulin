package art.yesulin.pdfextraction.domain.ai;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

public interface PdfAiModelCircuitRepository extends JpaRepository<PdfAiModelCircuit, String> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select circuit from PdfAiModelCircuit circuit where circuit.modelId = :modelId")
    Optional<PdfAiModelCircuit> findForUpdate(String modelId);
}
