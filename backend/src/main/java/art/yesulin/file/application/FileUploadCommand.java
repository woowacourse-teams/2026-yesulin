package art.yesulin.file.application;

import art.yesulin.file.domain.FileMetadata;

public record FileUploadCommand(String originalFilename, String contentType, long size) {

    public FileMetadata toMetadata() {
        return new FileMetadata(originalFilename, contentType, size);
    }
}
