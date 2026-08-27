package art.yesulin.application.admin.log;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminLogService {

    private final LogReader logReader;

    public LogLines findRecent(String keyword, int limit) {
        return logReader.readRecent(new LogQuery(keyword, limit));
    }
}
