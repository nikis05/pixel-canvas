use bitvec::{array::BitArray, field::BitField, prelude::*};
use std::fmt::Display;
use tonlib_core::{
    cell::{ArcCell, CellParser, TonCellError},
    tlb_types::tlb::TLB,
};

#[derive(Debug)]
pub struct Dna(bitvec::BitArr!(for 24_576, in u8));

impl Dna {
    pub fn from_boc(boc_b64: &str) -> anyhow::Result<Self> {
        let make_err = || anyhow::anyhow!("Invalid DNA");

        let cell = ArcCell::from_boc_b64(boc_b64).map_err(|_| make_err())?;

        let bits = cell
            .parse_fully(|parser| {
                let mut bits = BitVec::new();

                let mut put_bits = |parser: &mut CellParser, n: usize| {
                    if n == 0 {
                        return Ok::<_, TonCellError>(());
                    }

                    let full_bytes = n / 8;
                    let leftover_bits = n % 8;
                    let full_bits = full_bytes * 8;

                    if full_bits > 0 {
                        let raw = parser.load_bits(full_bits)?;

                        let slice = BitSlice::<u8, Lsb0>::from_slice(&raw);
                        bits.extend_from_bitslice(&slice[..full_bits]);
                    }

                    for _ in 0..leftover_bits {
                        let b = parser.load_bit()?;
                        bits.push(b);
                    }

                    Ok::<_, TonCellError>(())
                };

                put_bits(parser, 1023)?;

                let mut is_leftmost_branch = true;

                for _ in 0..4 {
                    let level1 = parser.next_reference()?;
                    let mut level1 = level1.parser();

                    put_bits(&mut level1, 1023)?;

                    for _ in 0..4 {
                        let level2 = level1.next_reference()?;
                        let mut level2 = level2.parser();

                        put_bits(&mut level2, 1023)?;

                        if is_leftmost_branch {
                            for _ in 0..3 {
                                let level3 = level2.next_reference()?;
                                let mut level3 = level3.parser();
                                put_bits(&mut level3, 1023)?;
                            }

                            let level3_last = level2.next_reference()?;
                            let mut level3_last = level3_last.parser();
                            put_bits(&mut level3_last, 24)?;

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
