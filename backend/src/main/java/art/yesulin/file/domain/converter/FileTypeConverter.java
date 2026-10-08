package art.yesulin.file.domain.converter;

import art.yesulin.file.domain.FileType;
import art.yesulin.global.persistence.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class FileTypeConverter extends StringEnumConverter<FileType> {

    public FileTypeConverter() {
        super(FileType.class);
    }
}
