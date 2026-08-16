package art.yesulin.domain.file.converter;

import art.yesulin.domain.common.converter.StringEnumConverter;
import art.yesulin.domain.file.FileStatus;
import jakarta.persistence.Converter;

@Converter
public class FileStatusConverter extends StringEnumConverter<FileStatus> {

    public FileStatusConverter() {
        super(FileStatus.class);
    }
}
