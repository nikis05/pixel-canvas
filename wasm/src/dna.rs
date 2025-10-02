use std::iter::repeat_n;

use base64::Engine;
use bitvec::{BitArr, array::BitArray, field::BitField, order::Lsb0, vec::BitVec, view::BitView};
use itertools::Itertools;
use tonlib_core::{
    cell::{Cell, CellBuilder},
    tlb_types::tlb::TLB,
};

#[derive(Debug)]
pub struct Dna(BitArr!(for 24_576, in u8));

impl Dna {
    pub fn from_base64(base64: &str) -> Option<Self> {
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(base64)
            .ok()?;

        let bytes = <[u8; 3072]>::try_from(bytes).ok()?;

        let bitarr = BitArray::new(bytes);

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

    pub fn to_cell(&self) -> Cell {
        let mut offset = 0;

        let mut put_bits = |builder: &mut CellBuilder, n: usize| {
            let slice = &self.0[offset..offset + n];
            offset += n;
            let bits = slice.to_bitvec();
            builder.store_bits(n, bits.as_raw_slice()).unwrap();
        };

        let put_ref = |builder: &mut CellBuilder, cell: Cell| {
            builder.store_reference(&cell.to_arc()).unwrap();
        };

        let mut level0 = CellBuilder::new();

        put_bits(&mut level0, 1023);

        let mut is_leftmost_branch = true;

        for _ in 0..4 {
            let mut level1 = CellBuilder::new();
            put_bits(&mut level1, 1023);

            for _ in 0..4 {
                let mut level2 = CellBuilder::new();
                put_bits(&mut level2, 1023);

                if is_leftmost_branch {
                    for _ in 0..3 {
                        let mut level3 = CellBuilder::new();
                        put_bits(&mut level3, 1023);
                        put_ref(&mut level2, level3.build().unwrap());
                    }

                    let mut level3_last = CellBuilder::new();
                    put_bits(&mut level3_last, 24);
                    put_ref(&mut level2, level3_last.build().unwrap());

                    is_leftmost_branch = false;
                }

                put_ref(&mut level1, level2.build().unwrap());
            }

            put_ref(&mut level0, level1.build().unwrap());
        }

        level0.build().unwrap()
    }
}
