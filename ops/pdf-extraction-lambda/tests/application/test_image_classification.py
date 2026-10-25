import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "src"))
from application.extraction import image_classification


class ImageClassificationTest(unittest.TestCase):
    def test_preserves_portraits_but_abstains_on_small_logo_and_footer_objects(self):
        cases = [
            ({"pixelWidth": 408, "pixelHeight": 408, "bbox": [.156, .118, .254, .187]}, "UNCERTAIN"),
            ({"pixelWidth": 1095, "pixelHeight": 1600, "bbox": [.714, .199, .874, .364]}, "CANDIDATE"),
            ({"pixelWidth": 282, "pixelHeight": 206, "bbox": [.452, .869, .566, .928]}, "UNCERTAIN"),
            ({"pixelWidth": 1068, "pixelHeight": 1600, "bbox": [.082, .091, .470, .503]}, "CANDIDATE"),
            ({"pixelWidth": 1200, "pixelHeight": 1600, "bbox": [0, 0, 1, 1]}, "UNCERTAIN"),
            ({"pixelWidth": 900, "pixelHeight": 120, "bbox": None}, "OTHER"),
        ]
        for metadata, expected in cases:
            with self.subTest(metadata=metadata):
                self.assertEqual(expected, image_classification(metadata))


if __name__ == "__main__":
    unittest.main()
