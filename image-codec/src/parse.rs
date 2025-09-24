use crate::ParseImageResponse;
use image::{
    DynamicImage, ImageDecoder, ImageError,
    codecs::{bmp::BmpDecoder, jpeg::JpegDecoder, png::PngDecoder},
};
use itertools::Itertools;
use js_sys::{Array, Number};
use std::{io::Cursor, str::FromStr};
use wasm_bindgen::JsValue;

pub fn parse(ext: &str, bytes: &[u8]) -> ParseImageResponse {
    let result = try_parse(ext, bytes);

    match result {
        Ok(image) => ParseImageResponse {
            status: "ok".into(),
            data: image
                .into_iter()
                .map(|row| {
                    row.into_iter()
                        .map(|pixel| JsValue::from(Number::from(pixel)))
                        .collect::<Array>()
                })
                .collect::<Array>()
                .into(),
        },
        Err(err) => ParseImageResponse {
            status: match err {
                ParseImageError::UnsupportedExtension => "unsupported_extension",
                ParseImageError::DecodeError => "decode_error",
                ParseImageError::WrongDimensions => "wrong_dimensions",
                ParseImageError::WrongPalette => "wrong_palette",
            }
            .into(),
            data: JsValue::UNDEFINED,
        },
    }
}

static CODES: phf::Map<[u8; 3], u8> = rust_colors::codes!();

fn try_parse(ext: &str, bytes: &[u8]) -> Result<Vec<Vec<u8>>, ParseImageError> {
    let ext = ImageExtension::from_str(ext)?;

    let decoder = ext
        .decoder(bytes)
        .map_err(|_| ParseImageError::DecodeError)?;

    let dimensions = decoder.dimensions();
    if dimensions.0 != 64 || dimensions.1 != 64 {
        return Err(ParseImageError::WrongDimensions);
    }

    let image = DynamicImage::from_decoder(decoder)
        .map_err(|_| ParseImageError::DecodeError)?
        .to_rgb8();

    let mut parsed = vec![];

    for row in &image.pixels().chunks(64) {
        let mut parsed_row = vec![];
        for pixel in row {
            let Some(code) = CODES.get(&[pixel.0[0], pixel.0[1], pixel.0[2]]).copied() else {
                return Err(ParseImageError::WrongPalette);
            };
            parsed_row.push(code);
        }
        parsed.push(parsed_row);
    }

    Ok(parsed)
}

enum ParseImageError {
    UnsupportedExtension,
    DecodeError,
    WrongDimensions,
    WrongPalette,
}

enum ImageExtension {
    Png,
    Jpeg,
    Bmp,
}

impl ImageExtension {
    fn decoder<'a>(&self, bytes: &'a [u8]) -> Result<Box<dyn ImageDecoder + 'a>, ImageError> {
        let cursor = Cursor::new(bytes);
        Ok(match self {
            Self::Png => Box::new(PngDecoder::new(cursor)?),
            Self::Jpeg => Box::new(JpegDecoder::new(cursor)?),
            Self::Bmp => Box::new(BmpDecoder::new(cursor)?),
        })
    }
}

impl FromStr for ImageExtension {
    type Err = ParseImageError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "png" => Ok(Self::Png),
            "jpg" | "jpeg" => Ok(Self::Jpeg),
            "bmp" => Ok(Self::Bmp),
            _ => Err(ParseImageError::UnsupportedExtension),
        }
    }
}
