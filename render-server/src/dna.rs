use std::str::FromStr;

use base64::Engine;
use bitvec::{array::BitArray, field::BitField};

pub struct Dna(bitvec::BitArr!(for 24_576, in u8));

impl Dna {
    pub fn pixels(&self) -> impl Iterator<Item = u8> {
        self.0.chunks(6).map(BitField::load::<u8>)
    }

    pub fn bytes(&self) -> &[u8] {
        self.0.as_raw_slice()
    }
}

impl FromStr for Dna {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let make_err = || anyhow::anyhow!("Invalid DNA");
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(s)
            .map_err(|_| make_err())?;
        let bits = BitArray::new(<[_; 3072]>::try_from(bytes).map_err(|_| make_err())?);
        Ok(Self(bits))
    }
}
