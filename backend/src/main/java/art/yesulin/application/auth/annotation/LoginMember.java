package art.yesulin.application.auth.annotation;

import art.yesulin.domain.member.MemberStatus;
import art.yesulin.domain.member.MemberType;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 세션의 로그인 회원을 파라미터로 주입한다.
 * roles와 statuses는 비어 있으면 조건을 걸지 않고, 값이 있으면 그 목록에 포함되어야 통과한다.
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface LoginMember {

    MemberType[] roles() default {};

    MemberStatus[] statuses() default {};
}
