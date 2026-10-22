package art.yesulin.auditionpost.domain.alertchat;

import java.util.List;
import org.springframework.data.domain.Pageable;

public interface OpenChatVisitQuery {

    List<OpenChatPostVisits> findPosts(Pageable pageable);

    long countPosts();
}
