package art.yesulin.domain.admin.query;

import java.util.List;

/** 최근 며칠의 일별 활동을 오래된 날짜부터 담는다. */
public record AdminActivity(List<AdminDailyActivity> days) {
}
