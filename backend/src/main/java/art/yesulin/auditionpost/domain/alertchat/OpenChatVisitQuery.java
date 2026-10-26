package art.yesulin.auditionpost.domain.alertchat;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Pageable;

public interface OpenChatVisitQuery {

    List<OpenChatPostVisits> findPosts(Pageable pageable, LocalDate startDate, LocalDate endDate);

    OpenChatVisitTotals summarize(LocalDate startDate, LocalDate endDate);
}
