package art.yesulin.auditionpost.domain.alertchat;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlertChatMemberCountRepository extends JpaRepository<AlertChatMemberCount, Long> {

    List<AlertChatMemberCount> findAllByOrderByRecordedAtAscIdAsc();
}
