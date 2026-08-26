package art.yesulin.domain.admin.converter;

import art.yesulin.domain.admin.AdminAction;
import art.yesulin.domain.common.converter.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class AdminActionConverter extends StringEnumConverter<AdminAction> {

    public AdminActionConverter() {
        super(AdminAction.class);
    }
}
