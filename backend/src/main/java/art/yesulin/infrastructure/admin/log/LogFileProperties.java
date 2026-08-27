package art.yesulin.infrastructure.admin.log;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 읽을 로그 파일 경로다. Spring Boot의 logging.file.name을 그대로 따라가며 요청으로 바꿀 수 없다.
 */
@ConfigurationProperties(prefix = "logging.file")
public record LogFileProperties(String name) {
}
