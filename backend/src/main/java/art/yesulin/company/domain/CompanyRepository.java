package art.yesulin.company.domain;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyRepository extends JpaRepository<Company, Long> {

    List<Company> findAllByOrderByIdDesc(Pageable pageable);
}
