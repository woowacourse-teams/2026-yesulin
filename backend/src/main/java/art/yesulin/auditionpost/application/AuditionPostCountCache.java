package art.yesulin.auditionpost.application;

import art.yesulin.auditionpost.domain.AuditionPostCounts;
import java.time.LocalDate;
import java.util.function.Supplier;

/** 공개 목록에서 날짜·분류가 같은 집계 결과를 재사용한다. */
public interface AuditionPostCountCache {

    AuditionPostCounts get(LocalDate today, String category, Supplier<AuditionPostCounts> loader);

    void invalidateAll();
}
