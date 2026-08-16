package art.yesulin.domain.common.converter;

import jakarta.persistence.AttributeConverter;

public abstract class StringEnumConverter<E extends Enum<E>> implements AttributeConverter<E, String> {

    private final Class<E> enumType;

    protected StringEnumConverter(Class<E> enumType) {
        this.enumType = enumType;
    }

    @Override
    public String convertToDatabaseColumn(E attribute) {
        return attribute == null ? null : attribute.name();
    }

    @Override
    public E convertToEntityAttribute(String dbData) {
        return dbData == null ? null : Enum.valueOf(enumType, dbData);
    }
}
