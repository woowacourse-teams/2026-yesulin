package art.yesulin.file.domain.converter;

import art.yesulin.file.domain.FileStatus;
import art.yesulin.global.persistence.StringEnumConverter;
import jakarta.persistence.Converter;

@Converter
public class FileStatusConverter extends StringEnumConverter<FileStatus> {

    public FileStatusConverter() {
        super(FileStatus.class);
    }
}
