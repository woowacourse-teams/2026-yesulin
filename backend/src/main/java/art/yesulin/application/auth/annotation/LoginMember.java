package art.yesulin.application.auth.annotation;

import art.yesulin.domain.member.MemberType;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface LoginMember {

    MemberType[] roles() default {};
}
