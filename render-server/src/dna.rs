use bitvec::{array::BitArray, field::BitField, prelude::*};
use std::fmt::Display;
use tonlib_core::{cell::ArcCell, tlb_types::tlb::TLB};

#[derive(Debug)]
pub struct Dna(bitvec::BitArr!(for 24_576, in u8));

impl Dna {
    pub fn from_boc(boc_b64: &str) -> anyhow::Result<Self> {
        let make_err = || anyhow::anyhow!("Invalid DNA");

        let cell = ArcCell::from_boc_b64(boc_b64).map_err(|_| make_err())?;

        let bits = cell
            .parse_fully(|parser| {
                let mut bits = BitVec::new();

                let level0_bits = parser.load_bits(1023)?;
                bits.extend_from_raw_slice(&level0_bits);
                bits.pop();

                let mut is_leftmost_branch = true;

                for _ in 0..4 {
                    let level1 = parser.next_reference()?;
                    let mut level1 = level1.parser();

                    let level1_bits = level1.load_bits(1023)?;
                    bits.extend_from_raw_slice(&level1_bits);
                    bits.pop();

                    for _ in 0..4 {
                        let level2 = level1.next_reference()?;
                        let mut level2 = level2.parser();

                        let level2_bits = level2.load_bits(1023)?;
                        bits.extend_from_raw_slice(&level2_bits);
                        bits.pop();

                        if is_leftmost_branch {
                            for _ in 0..3 {
                                let level3_bits =
                                    level2.next_reference()?.parser().load_bits(1023)?;
                                bits.extend_from_raw_slice(&level3_bits);
                                bits.pop();
                            }

                            let level3_last = level2.next_reference()?.parser().load_bits(24)?;
                            bits.extend_from_raw_slice(&level3_last);

                            is_leftmost_branch = false;
                        }
                    }
                }

                Ok(bits)
            })
            .map_err(|_| make_err())?;

        let mut bitarr = BitArray::new([0; _]);
        bitarr.copy_from_bitslice(bits.as_bitslice());

        Ok(Self(bitarr))
    }

    pub fn pixels(&self) -> impl Iterator<Item = u8> {
        self.0.chunks(6).map(BitField::load::<u8>)
    }
}

impl Display for Dna {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}
