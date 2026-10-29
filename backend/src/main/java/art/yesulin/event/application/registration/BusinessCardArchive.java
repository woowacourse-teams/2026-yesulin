package art.yesulin.event.application.registration;

import art.yesulin.event.application.registration.AdminEventRegistrationResult.Career;
import art.yesulin.file.application.storage.StoredObjectContent;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.SerializationFeature;

/**
 * 명함 희망 배우의 정보와 사진을 zip 하나로 묶는다. 사람이 보는 {@code business-cards.csv}(엑셀용 BOM 포함), 명함 생성
 * 스크립트가 읽는 {@code business-cards.json}, {@code photos/{신청 번호}.jpg} 사진을 담는다. 사진은 한 장씩 읽어 바로 쓰므로
 * 서버 메모리에 모두 올리지 않는다.
 */
@Component
@RequiredArgsConstructor
public class BusinessCardArchive {

    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", "jpg", "image/png", "png", "image/webp", "webp"
    );
    private static final byte[] UTF8_BOM = {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};

    private final EventRegistrationPhotoStorage storage;
    private final ObjectMapper objectMapper;

    public void write(List<BusinessCardEntry> entries, OutputStream output) throws IOException {
        try (ZipOutputStream zip = new ZipOutputStream(output, StandardCharsets.UTF_8)) {
            List<BusinessCardEntry> written = new ArrayList<>();
            for (BusinessCardEntry entry : entries) {
                written.add(entry.withPhotoFile(writePhoto(zip, entry)));
            }
            put(zip, "business-cards.json", objectMapper.writer(SerializationFeature.INDENT_OUTPUT)
                    .writeValueAsBytes(written.stream().map(BusinessCardArchive::json).toList()));
            put(zip, "business-cards.csv", csv(written));
        }
    }

    private String writePhoto(ZipOutputStream zip, BusinessCardEntry entry) throws IOException {
        if (entry.photoKey() == null) {
            return null;
        }
        Optional<StoredObjectContent> photo = storage.read(entry.photoKey());
        if (photo.isEmpty()) {
            return null;
        }
        String type = photo.get().contentType() == null ? "" : photo.get().contentType().toLowerCase(Locale.ROOT);
        String file = "photos/%d.%s".formatted(entry.id(), EXTENSIONS.getOrDefault(type, "jpg"));
        put(zip, file, photo.get().bytes());
        return file;
    }

    /** 묶음 파일에는 저장소 키를 남기지 않는다. */
    private static Map<String, Object> json(BusinessCardEntry entry) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("id", entry.id());
        value.put("name", entry.name());
        value.put("birthDate", entry.birthDate() == null ? null : entry.birthDate().toString());
        value.put("email", entry.email());
        value.put("snsHandle", entry.snsHandle());
        value.put("snsPlatform", entry.snsPlatform());
        value.put("activityFields", entry.activityFields().stream().map(Enum::name).toList());
        value.put("otherActivity", entry.otherActivity());
        value.put("noCareer", entry.noCareer());
        value.put("careers", entry.careers());
        value.put("intro", entry.intro());
        value.put("photoFile", entry.photoFile());
        value.put("createdAt", entry.createdAt().toString());
        return value;
    }

    private static byte[] csv(List<BusinessCardEntry> entries) {
        StringBuilder text = new StringBuilder("신청번호,이름,생년월일,이메일,SNS,SNS유형,활동분야,기타분야,경력없음,경력,한줄소개,사진,신청시각\n");
        for (BusinessCardEntry entry : entries) {
            String careers = entry.careers().stream()
                    .map(BusinessCardArchive::careerLine)
                    .collect(Collectors.joining(" / "));
            text.append(String.join(",",
                    String.valueOf(entry.id()),
                    cell(entry.name()),
                    cell(entry.birthDate() == null ? null : entry.birthDate().toString()),
                    cell(entry.email()),
                    cell(entry.snsHandle()),
                    cell(entry.snsPlatform() == null ? null : entry.snsPlatform().name()),
                    cell(entry.activityFields().stream().map(Enum::name).collect(Collectors.joining(" "))),
                    cell(entry.otherActivity()),
                    entry.noCareer() ? "Y" : "",
                    cell(careers),
                    cell(entry.intro()),
                    cell(entry.photoFile()),
                    cell(entry.createdAt().toString())
            )).append('\n');
        }
        byte[] body = text.toString().getBytes(StandardCharsets.UTF_8);
        byte[] withBom = new byte[UTF8_BOM.length + body.length];
        System.arraycopy(UTF8_BOM, 0, withBom, 0, UTF8_BOM.length);
        System.arraycopy(body, 0, withBom, UTF8_BOM.length, body.length);
        return withBom;
    }

    private static String careerLine(Career career) {
        return career.role() == null
                ? "%s %s".formatted(career.performedMonth(), career.workTitle())
                : "%s %s %s".formatted(career.performedMonth(), career.workTitle(), career.role());
    }

    /** 쉼표·따옴표·줄바꿈이 있으면 따옴표로 감싼다. 엑셀이 수식으로 읽지 않게 =,+,-,@로 시작하면 앞에 '를 붙인다. */
    private static String cell(String value) {
        if (value == null) {
            return "";
        }
        String safe = value.isEmpty() || "=+-@".indexOf(value.charAt(0)) < 0 ? value : "'" + value;
        if (safe.contains(",") || safe.contains("\"") || safe.contains("\n")) {
            return "\"" + safe.replace("\"", "\"\"") + "\"";
        }
        return safe;
    }

    private static void put(ZipOutputStream zip, String name, byte[] bytes) throws IOException {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(bytes);
        zip.closeEntry();
    }
}
