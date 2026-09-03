package art.yesulin.presentation.api;

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
 */
@RestController
@RequestMapping("/api/v1/health")
@RequiredArgsConstructor
public class HealthApiController {

    private final JdbcTemplate jdbcTemplate;

    @GetMapping
    public ResponseEntity<HealthResponse> check() {
        if (!isDatabaseReachable()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(new HealthResponse("DOWN", "DOWN"));
        }
        return ResponseEntity.ok(new HealthResponse("UP", "UP"));
    }

    private boolean isDatabaseReachable() {
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return true;
        } catch (DataAccessException exception) {
            return false;
        }
    }
}
