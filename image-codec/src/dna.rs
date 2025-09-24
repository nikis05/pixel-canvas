use base64::Engine;
use bitvec::{BitArr, array::BitArray, field::BitField, order::Lsb0, vec::BitVec, view::BitView};
use itertools::Itertools;

#[derive(Debug)]
pub struct Dna(BitArr!(for 24_576, in u8));

impl Dna {
    pub fn from_base64(base64: &str) -> Option<Self> {
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(base64)
            .ok()?;

        dbg!(1);

        let bytes = <[u8; 3072]>::try_from(bytes).ok()?;

        dbg!(2);

        let bitarr = BitArray::new(bytes);

        dbg!(3);
        Some(Self(bitarr))
    }

    pub fn to_base64(&self) -> String {
        let bytes = self.0.as_raw_slice();

        base64::engine::general_purpose::STANDARD.encode(bytes)
    }

    pub fn from_data(data: Vec<Vec<u8>>) -> Self {
        let mut bitvec = BitVec::new();
        for row in data {
            for pixel in row {
                let bits = pixel.view_bits::<Lsb0>();
                bitvec.extend_from_bitslice(&bits[..6]);
            }
        }

        let mut bitarr = BitArray::new([0; _]);
        bitarr.copy_from_bitslice(&bitvec);
        Self(bitarr)
    }

    pub fn to_data(&self) -> Vec<Vec<u8>> {
        self.0
            .chunks(6)
            .map(BitField::load::<u8>)
            .chunks(64)
            .into_iter()
            .map(Itertools::collect_vec)
            .collect_vec()
    }
}
