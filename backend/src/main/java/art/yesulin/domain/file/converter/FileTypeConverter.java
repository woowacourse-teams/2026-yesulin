package art.yesulin.domain.file.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.domain.file.FileType;
import jakarta.persistence.Converter;

@Converter
public class FileTypeConverter extends StringEnumConverter<FileType> {

    public FileTypeConverter() {
        super(FileType.class);
    }
}
