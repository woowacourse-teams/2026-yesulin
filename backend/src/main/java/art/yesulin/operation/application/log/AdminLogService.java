package art.yesulin.operation.application.log;

import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminLogService {

    private final LogReader logReader;

    public LogLines findRecent(String keyword, int limit, LocalDate date) {
        return logReader.readRecent(new LogQuery(keyword, limit, date));
    }
}
