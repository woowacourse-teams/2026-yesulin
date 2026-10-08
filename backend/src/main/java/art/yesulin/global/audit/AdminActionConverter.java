package art.yesulin.global.audit;

import art.yesulin.global.persistence.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class AdminActionConverter extends StringEnumConverter<AdminAction> {

    public AdminActionConverter() {
        super(AdminAction.class);
    }
}
