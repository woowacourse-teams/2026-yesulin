package art.yesulin.file.application.thumbnail;

import com.drew.imaging.ImageMetadataReader;
import com.drew.imaging.ImageProcessingException;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.ExifIFD0Directory;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReadParam;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.MemoryCacheImageInputStream;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import org.springframework.stereotype.Component;

@Component
public class PosterImageConverter {

    private static final int MAX_WIDTH = 640;
    private static final int MAX_HEIGHT = 1280;
    private static final long MAX_PIXELS = 48_000_000;
    private static final Set<String> FORMATS = Set.of("jpeg", "png", "gif", "webp");

    public Optional<byte[]> convert(byte[] original) throws IOException {
        try (MemoryCacheImageInputStream input = new MemoryCacheImageInputStream(new ByteArrayInputStream(original))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                return Optional.empty();
            }
            return convert(readers.next(), input, original);
        }
    }

    private Optional<byte[]> convert(ImageReader reader, MemoryCacheImageInputStream input, byte[] original)
            throws IOException {
        try {
            reader.setInput(input, true, true);
            if (!supported(reader)) {
                return Optional.empty();
            }
            byte[] thumbnail = jpeg(resize(read(reader), orientation(original)));
            return smallerThanOriginal(original, thumbnail);
        } finally {
            reader.dispose();
        }
    }

    private boolean supported(ImageReader reader) throws IOException {
        return FORMATS.contains(reader.getFormatName().toLowerCase(Locale.ROOT))
                && (long) reader.getWidth(0) * reader.getHeight(0) <= MAX_PIXELS;
    }

    private BufferedImage read(ImageReader reader) throws IOException {
        ImageReadParam options = reader.getDefaultReadParam();
        int longest = Math.max(reader.getWidth(0), reader.getHeight(0));
        int shortest = Math.min(reader.getWidth(0), reader.getHeight(0));
        int factor = Math.max(1, Math.min(longest / (2 * MAX_HEIGHT), shortest / MAX_WIDTH));
        options.setSourceSubsampling(factor, factor, 0, 0);
        return reader.read(0, options);
    }

    private int orientation(byte[] original) throws IOException {
        try {
            Metadata metadata = ImageMetadataReader.readMetadata(new ByteArrayInputStream(original));
            ExifIFD0Directory directory = metadata.getFirstDirectoryOfType(ExifIFD0Directory.class);
            return Optional.ofNullable(directory)
                    .map(value -> value.getInteger(ExifIFD0Directory.TAG_ORIENTATION)).orElse(1);
        } catch (ImageProcessingException exception) {
            return 1;
        }
    }

    private BufferedImage resize(BufferedImage source, int orientation) {
        int width = source.getWidth();
        int height = source.getHeight();
        boolean turned = orientation >= 5 && orientation <= 8;
        int displayWidth = width;
        int displayHeight = height;
        if (turned) {
            displayWidth = height;
            displayHeight = width;
        }
        int cardHeight = Math.min(displayHeight, displayWidth * 2);
        double scale = Math.min(1, Math.min((double) MAX_WIDTH / displayWidth, (double) MAX_HEIGHT / cardHeight));
        int targetWidth = Math.max(1, (int) Math.round(displayWidth * scale));
        int targetHeight = Math.max(1, (int) Math.round(cardHeight * scale));
        BufferedImage target = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
        draw(source, target, transform(orientation, width, height), displayWidth, cardHeight);
        return target;
    }

    private void draw(BufferedImage source, BufferedImage target, AffineTransform transform, int width, int height) {
        Graphics2D graphics = target.createGraphics();
        try {
            graphics.setColor(Color.WHITE);
            graphics.fillRect(0, 0, target.getWidth(), target.getHeight());
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graphics.scale((double) target.getWidth() / width, (double) target.getHeight() / height);
            graphics.drawImage(source, transform, null);
        } finally {
            graphics.dispose();
        }
    }

    private AffineTransform transform(int orientation, int width, int height) {
        return switch (orientation) {
            case 2 -> new AffineTransform(-1, 0, 0, 1, width, 0);
            case 3 -> new AffineTransform(-1, 0, 0, -1, width, height);
            case 4 -> new AffineTransform(1, 0, 0, -1, 0, height);
            case 5 -> new AffineTransform(0, 1, 1, 0, 0, 0);
            case 6 -> new AffineTransform(0, 1, -1, 0, height, 0);
            case 7 -> new AffineTransform(0, -1, -1, 0, height, width);
            case 8 -> new AffineTransform(0, -1, 1, 0, 0, width);
            default -> new AffineTransform();
        };
    }

    private byte[] jpeg(BufferedImage image) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        try (MemoryCacheImageOutputStream output = new MemoryCacheImageOutputStream(bytes)) {
            writer.setOutput(output);
            ImageWriteParam options = writer.getDefaultWriteParam();
            options.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            options.setCompressionQuality(0.85f);
            writer.write(null, new IIOImage(image, null, null), options);
            output.flush();
            return bytes.toByteArray();
        } finally {
            writer.dispose();
        }
    }

    private Optional<byte[]> smallerThanOriginal(byte[] original, byte[] thumbnail) {
        if (thumbnail.length >= original.length) {
            return Optional.empty();
        }
        return Optional.of(thumbnail);
    }
}
