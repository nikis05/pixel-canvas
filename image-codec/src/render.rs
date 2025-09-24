use image::{RgbImage, codecs::png::PngEncoder};
use itertools::Itertools;
use std::iter;

static COLORS: phf::Map<u8, image::Rgb<u8>> = rust_colors::colors!();

pub fn render(data: &[Vec<u8>], upscale: bool) -> Vec<u8> {
    let scale = if upscale { 10 } else { 1 };
    let pixels = data
        .iter()
        .flat_map(|pixels| {
            pixels
                .iter()
                .flat_map(|pixel| COLORS.get(pixel).unwrap().0.iter().copied())
                .repeat_n(scale)
        })
        .repeat_n(scale)
        .collect_vec();
    let image = RgbImage::from_vec(64, 64, pixels).unwrap();

    let mut bytes = vec![];
    image
        .write_with_encoder(PngEncoder::new(&mut bytes))
        .unwrap();

    bytes
}

trait IteratorExt<T> {
    fn repeat_n(self, n: usize) -> impl Iterator<Item = T>;
}

impl<I, T> IteratorExt<T> for I
where
    I: Iterator<Item = T>,
    T: Clone,
{
    fn repeat_n(self, n: usize) -> impl Iterator<Item = T> {
        self.flat_map(move |elem| iter::repeat_n(elem, n))
    }
}
