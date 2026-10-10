package art.yesulin.auth.infrastructure.security;

import art.yesulin.auth.application.MemberPrincipal;
import art.yesulin.auth.domain.member.MemberStatus;
import art.yesulin.auth.domain.member.MemberType;
import org.springframework.security.jackson.SecurityJacksonModules;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/**
 * 세션 속성을 JSON으로 저장한다. 로그인 정보는 클래스 경로 대신 고정된 이름과 값으로 저장해
 * 클래스를 옮기거나 이름을 바꿔도 기존 세션을 읽을 수 있게 하고,
 * Spring Security가 넣는 값은 Spring Security가 허용한 타입만 역직렬화한다.
 */
public class SessionAttributeJsonCodec {

    private static final String TYPE_FIELD = "sessionAttributeType";
    private static final String MEMBER_PRINCIPAL_TYPE = "memberPrincipal";

    private final JsonMapper plainMapper = JsonMapper.builder().build();
    private final JsonMapper securityMapper;

    public SessionAttributeJsonCodec(ClassLoader classLoader) {
        this.securityMapper = JsonMapper.builder()
                .addModules(SecurityJacksonModules.getModules(classLoader))
                .build();
    }

    public byte[] serialize(Object value) {
        if (value instanceof MemberPrincipal principal) {
            return plainMapper.writeValueAsBytes(memberPrincipalNode(principal));
        }
        return securityMapper.writeValueAsBytes(value);
    }

    public Object deserialize(byte[] bytes) {
        JsonNode node = plainMapper.readTree(bytes);
        if (node.isObject() && MEMBER_PRINCIPAL_TYPE.equals(node.path(TYPE_FIELD).asString(null))) {
            return memberPrincipal(node);
        }
        return securityMapper.readValue(bytes, Object.class);
    }

    private ObjectNode memberPrincipalNode(MemberPrincipal principal) {
        return plainMapper.createObjectNode()
                .put(TYPE_FIELD, MEMBER_PRINCIPAL_TYPE)
                .put("memberId", principal.memberId())
                .put("role", principal.role().name())
                .put("status", principal.status().name());
    }

    private MemberPrincipal memberPrincipal(JsonNode node) {
        return new MemberPrincipal(
                node.get("memberId").asLong(),
                MemberType.valueOf(node.get("role").asString()),
                MemberStatus.valueOf(node.get("status").asString())
        );
    }
}
