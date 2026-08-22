package art.yesulin.application.screening;

import java.util.List;

public interface ScreeningSubmissionReader {

    List<ScreeningSubmissionView> findAll(long auditionId, long roleId);
}
