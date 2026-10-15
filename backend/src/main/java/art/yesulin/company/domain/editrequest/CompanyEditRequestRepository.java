package art.yesulin.company.domain.editrequest;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyEditRequestRepository extends JpaRepository<CompanyEditRequest, Long> {

    List<CompanyEditRequest> findAllByStatusOrderByIdDesc(CompanyEditRequestStatus status, Pageable pageable);
}
