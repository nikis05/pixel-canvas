use crate::{dna::Dna, render::colors::COLORS};
use bytes::{BufMut, Bytes, BytesMut};
use image::{RgbImage, codecs::png::PngEncoder};
use itertools::Itertools;
use std::iter;

mod colors;

pub async fn render(dna: Dna) -> Bytes {
    tokio_rayon::spawn_fifo(move || {
        let rows = dna.pixels().chunks(64);
        let pixels = rows
            .into_iter()
            .flat_map(|pixels| {
                pixels
                    .flat_map(|pixel| COLORS.get(&pixel).unwrap().0.iter().copied())
                    .repeat_n(10)
            })
            .repeat_n(10)
            .collect_vec();
        let image = RgbImage::from_vec(64, 64, pixels).unwrap();
        let mut bytes = BytesMut::new();
        image
            .write_with_encoder(PngEncoder::new((&mut bytes).writer()))
            .unwrap();
        bytes.freeze()
    })
    .await
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
