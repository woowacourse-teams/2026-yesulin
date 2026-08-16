package art.yesulin.application.file;

import art.yesulin.domain.file.FileMetadata;

public record FileUploadCommand(String originalFilename, String contentType, long size) {

    public FileMetadata toMetadata() {
        return new FileMetadata(originalFilename, contentType, size);
    }
}
