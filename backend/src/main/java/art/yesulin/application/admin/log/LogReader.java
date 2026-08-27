package art.yesulin.application.admin.log;

/**
 * 애플리케이션 로그를 읽는 port다. 구현은 infrastructure가 담당한다.
 */
public interface LogReader {

    LogLines readRecent(LogQuery query);
}
