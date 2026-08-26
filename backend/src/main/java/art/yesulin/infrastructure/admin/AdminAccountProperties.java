package art.yesulin.infrastructure.admin;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 운영자 계정 설정이다. 가입 API가 없으므로 서버 환경 변수로만 계정을 등록한다.
 * 형식은 `email:password`이고 여러 개는 쉼표로 잇는다. 이메일과 비밀번호에는 `:`와 `,`를 쓸 수 없다.
 */
@ConfigurationProperties(prefix = "yesulin.admin")
public record AdminAccountProperties(String accounts) {
}
