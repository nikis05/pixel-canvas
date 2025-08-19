use base64::Engine;
use bitvec::{array::BitArray, field::BitField};
use bytes::{BufMut, Bytes, BytesMut};
use image::{RgbImage, codecs::png::PngEncoder};
use itertools::Itertools;
use std::{iter, str::FromStr};

use crate::render::colors::COLORS;

mod colors;

pub struct Dna(bitvec::BitArr!(for 262_144, in u8));

impl Dna {
    pub fn pixels(&self) -> impl Iterator<Item = u8> {
        self.0.chunks(6).map(BitField::load::<u8>)
    }
}

impl FromStr for Dna {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let make_err = || anyhow::anyhow!("Invalid DNA");
        let bytes = base64::engine::general_purpose::URL_SAFE
            .decode(s)
            .map_err(|_| make_err())?;
        let bits = BitArray::new(<[_; 32768]>::try_from(bytes).map_err(|_| make_err())?);
        Ok(Self(bits))
    }
}

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
