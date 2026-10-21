package art.yesulin.global.web;

import java.net.InetAddress;
import java.net.UnknownHostException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 배포 검증과 외부 모니터링이 호출하는 상태 확인 API.
 * 외부 호환용 상태 API다. ALB와 CodeDeploy는 Actuator readiness endpoint를 사용한다.
 * 배포 중 어느 인스턴스가 응답했는지 확인할 수 있도록 응답 헤더에 서버의 사설 IP를 담는다.
 */
@RestController
@RequestMapping("/api/v1/health")
@RequiredArgsConstructor
public class HealthApiController {

    private static final String SERVED_BY_HEADER = "X-Served-By";

    private final JdbcTemplate jdbcTemplate;
    private final String servedBy = resolveServerAddress();

    @GetMapping
    public ResponseEntity<HealthResponse> check() {
        if (!isDatabaseReachable()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .header(SERVED_BY_HEADER, servedBy)
                    .body(new HealthResponse("DOWN", "DOWN"));
        }
        return ResponseEntity.ok()
                .header(SERVED_BY_HEADER, servedBy)
                .body(new HealthResponse("UP", "UP"));
    }

    private boolean isDatabaseReachable() {
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return true;
        } catch (DataAccessException exception) {
            return false;
        }
    }

    private static String resolveServerAddress() {
        try {
            return InetAddress.getLocalHost().getHostAddress();
        } catch (UnknownHostException exception) {
            return "unknown";
        }
    }
}
