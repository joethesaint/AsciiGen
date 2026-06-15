"""
AsciiEngine: The heart of the PointGen volumetric renderer.
Unified implementation for classic ASCII art and 3D metadata extraction.
"""

import base64
import hashlib
import io
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import yaml
from PIL import Image, ImageEnhance, ImageFilter, ImageOps


@dataclass
class EngineConfig:
    """Type-safe configuration for the AsciiEngine."""
    processing: Dict[str, Any] = field(default_factory=lambda: {
        "font_aspect": 0.5,
        "high_quality": True,
        "autocontrast": False,
    })
    output: Dict[str, Any] = field(default_factory=lambda: {
        "width": 100,
        "char_set": "default",
        "filename": "output.txt",
        "save_to_file": False,
    })
    features: Dict[str, Any] = field(default_factory=lambda: {
        "color": False,
        "borders": False,
        "border_char": "#",
    })

    @classmethod
    def from_yaml(cls, path: Path) -> "EngineConfig":
        """Loads configuration from a YAML file."""
        if not path.exists():
            return cls()
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)
            return cls(
                processing=data.get("processing", {}),
                output=data.get("output", {}),
                features=data.get("features", {}),
            )


class AsciiEngine:
    """
    Unified engine for generating ASCII art and 3D volumetric metadata.
    Follows 'Explicit is better than implicit' and 'Simple is better than complex'.
    """

    DETAILED_CHARS = (
        " .'`^\\\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"
    )
    CHAR_SETS = {
        "default": "@%#*+=-:. ",
        "reverse": " .:-=+*#%@",
        "detailed": DETAILED_CHARS,
        "pointism": "  .·:∵∴∷•",
    }

    def __init__(self, config: Optional[EngineConfig] = None):
        self.config = config or EngineConfig()
        self._analysis_cache: Dict[str, Dict[str, Any]] = {}

    def _calculate_dimensions(
        self,
        img_size: Tuple[int, int],
        width: Optional[int] = None,
        height: Optional[int] = None,
        scale: Optional[float] = None,
    ) -> Tuple[int, int]:
        """Pure logic for grid dimension calculation."""
        orig_w, orig_h = img_size
        aspect = self.config.processing["font_aspect"]

        if scale is not None:
            return int(orig_w * scale), int(orig_h * scale * aspect)

        if height is not None and width is None:
            return int((orig_w / orig_h) * height / aspect), height

        t_w = width or self.config.output.get("width", 100)
        t_h = height or int((orig_h / orig_w) * t_w * aspect)
        return t_w, t_h

    def _get_image_hash(self, image_stream: io.BytesIO, **params: Any) -> str:
        """Generates a unique identifier for caching purposes."""
        image_stream.seek(0)
        data = image_stream.read()
        image_stream.seek(0)
        param_str = "-".join(f"{k}:{v}" for k, v in sorted(params.items()))
        return hashlib.md5(data + param_str.encode()).hexdigest()

    def _get_resample_filter(self) -> Any:
        """Returns the best available resampling filter for current environment."""
        if hasattr(Image, "Resampling"):
            return Image.Resampling.LANCZOS
        return getattr(Image, "ANTIALIAS", Image.BICUBIC)

    def generate_ascii(
        self,
        image_source: Union[Path, io.BytesIO],
        char_set: str = "default",
        **dim_params: Any,
    ) -> str:
        """Generates classic ASCII text art from an image."""
        img = Image.open(image_source)
        tw, th = self._calculate_dimensions(img.size, **dim_params)

        if self.config.processing["autocontrast"]:
            img = ImageOps.autocontrast(img.convert("L"))

        resample_filter = self._get_resample_filter()
        img = img.resize((tw, th), resample_filter).convert("L")

        pixels = np.array(img)
        chars = self.CHAR_SETS.get(char_set, self.CHAR_SETS["default"])
        
        return "\n".join(
            "".join(chars[int(p / 255 * (len(chars) - 1))] for p in row) 
            for row in pixels
        )

    def analyze_volumetric(
        self,
        image_stream: io.BytesIO,
        zoom: float = 1.0,
        kernel_name: str = "edges"
    ) -> Dict[str, Any]:
        """Extracts structural weights and metadata for the 3D renderer."""
        params = {"zoom": zoom, "kernel": kernel_name}
        img_hash = self._get_image_hash(image_stream, **params)
        
        if img_hash in self._analysis_cache:
            return self._analysis_cache[img_hash]

        img = Image.open(image_stream).convert("L")
        w, h = img.size
        
        # Viewport logic
        new_w, new_h = w / zoom, h / zoom
        left, top = (w - new_w) / 2, (h - new_h) / 2
        right, bottom = (w + new_w) / 2, (h + new_h) / 2

        if zoom < 1.0:
            canvas = Image.new("L", (int(new_w), int(new_h)), color=0)
            offset_x, offset_y = int((new_w - w) / 2), int((new_h - h) / 2)
            canvas.paste(img, (offset_x, offset_y))
            img = canvas
        else:
            img = img.crop((left, top, right, bottom))

        # Standard analyze resolution: 400x400 is ideal for 3D sampling without overhead
        target_size = (400, 400)
        resample_filter = self._get_resample_filter()
        img = img.resize(target_size, resample_filter)
        
        # Apply Convolution
        kernels = {
            "edges": ImageFilter.FIND_EDGES,
            "sharp": ImageFilter.SHARPEN,
            "blur": ImageFilter.BLUR,
            "emboss": ImageFilter.EMBOSS,
            "relief": ImageFilter.CONTOUR, # High-contrast structural relief
        }
        selected_kernel = kernels.get(kernel_name, ImageFilter.FIND_EDGES)
        processed_img = img.filter(selected_kernel)

        result = {
            "width": target_size[0],
            "height": target_size[1],
            "weight_map": list(processed_img.getdata()),
            "zoom_applied": zoom,
            "kernel_applied": kernel_name,
        }
        
        self._analysis_cache[img_hash] = result
        return result

    def generate_depth_map(self, image_stream: io.BytesIO) -> Dict[str, Any]:
        """Generates a high-contrast depth relief map encoded in base64."""
        img = Image.open(image_stream).convert("L")
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(2.0)
        
        buffered = io.BytesIO()
        img.save(buffered, format="JPEG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return {
            "depth_map": img_str,
            "width": img.width,
            "height": img.height
        }
