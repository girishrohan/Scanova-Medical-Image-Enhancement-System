"""
Tests for export_service module.
"""

import pytest
import numpy as np
import cv2
import io

from services.export_service import (
    image_to_png_bytes,
    image_to_display_rgb,
    generate_pdf_report,
)


class TestImageToPngBytes:
    """Tests for image to PNG bytes conversion."""

    def test_png_conversion_color(self):
        """Test PNG conversion for color image."""
        image = np.random.randint(0, 255, (50, 50, 3), dtype=np.uint8)

        img_bytes = image_to_png_bytes(image)

        assert isinstance(img_bytes, bytes)
        assert len(img_bytes) > 0

    def test_png_conversion_grayscale(self):
        """Test grayscale image conversion."""
        image = np.random.randint(0, 255, (50, 50), dtype=np.uint8)

        img_bytes = image_to_png_bytes(image)

        assert isinstance(img_bytes, bytes)

    def test_roundtrip_consistency(self):
        """Test that converted bytes can be decoded back."""
        original = np.random.randint(0, 255, (50, 50, 3), dtype=np.uint8)

        img_bytes = image_to_png_bytes(original)
        decoded = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_COLOR)

        # Check dimensions preserved
        assert decoded.shape[:2] == original.shape[:2]

    def test_none_raises_value_error(self):
        """None image raises ValueError."""
        with pytest.raises(ValueError, match="None"):
            image_to_png_bytes(None)


class TestImageToDisplayRgb:
    """Tests for BGR to RGB conversion."""

    def test_rgb_conversion(self):
        """Test BGR to RGB conversion."""
        image = np.random.randint(0, 255, (50, 50, 3), dtype=np.uint8)

        rgb = image_to_display_rgb(image)

        assert rgb.shape == image.shape

    def test_grayscale_returned_unchanged(self):
        """Test grayscale image is returned unchanged."""
        image = np.random.randint(0, 255, (50, 50), dtype=np.uint8)

        result = image_to_display_rgb(image)

        np.testing.assert_array_equal(result, image)

    def test_none_returns_zeros(self):
        """None returns a default 64x64 zero image."""
        result = image_to_display_rgb(None)
        assert result.shape == (64, 64)
        assert np.all(result == 0)


class TestGeneratePdfReport:
    """Tests for PDF report generation."""

    def test_pdf_generation(self):
        """Test PDF can be generated with mock data."""
        original = np.random.randint(0, 255, (50, 50, 3), dtype=np.uint8)
        enhanced = np.random.randint(0, 255, (50, 50, 3), dtype=np.uint8)

        from collections import namedtuple

        Metrics = namedtuple('Metrics', ['mean', 'std', 'entropy', 'laplacian_var', 'intensity_range', 'min_val', 'max_val'])
        Settings = namedtuple('Settings', ['noise_method', 'kernel_size', 'contrast_method',
                                           'clahe_clip_limit', 'clahe_tile_grid',
                                           'sharpen_strength', 'sharpen_sigma'])

        orig_metrics = Metrics(mean=128, std=50, entropy=7.0, laplacian_var=100,
                               intensity_range='0-255', min_val=0, max_val=255)
        enh_metrics = Metrics(mean=135, std=55, entropy=7.2, laplacian_var=120,
                              intensity_range='0-255', min_val=0, max_val=255)
        settings = Settings(noise_method='Median', kernel_size=3, contrast_method='CLAHE',
                              clahe_clip_limit=2.0, clahe_tile_grid=8,
                              sharpen_strength=1.0, sharpen_sigma=1.0)

        pdf_bytes = generate_pdf_report(
            original, enhanced, orig_metrics, enh_metrics,
            settings, {'mean_delta': 7, 'std_delta_pct': 10, 'entropy_delta_pct': 2.9,
                       'lap_var_delta_pct': 20, 'range_delta': 0}, 150.5, 'test.png'
        )

        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert b'%PDF' in pdf_bytes[:10]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])