use tonlib_core::{TonAddress, cell::CellBuilder, tlb_types::tlb::TLB};

use crate::dna::Dna;

pub fn pack_dna(dna: &Dna) -> String {
    dna.to_cell().to_boc_b64(true).unwrap()
}

pub fn pack_bake(title: &str, artist: &str, dna: &Dna) -> String {
    let mut message = CellBuilder::new();
    message.store_u32(32, 0xf0f7_c18a).unwrap();
    message
        .store_reference(
            &CellBuilder::new()
                .store_string(title)
                .unwrap()
                .build()
                .unwrap()
                .to_arc(),
        )
        .unwrap();
    message
        .store_reference(
            &CellBuilder::new()
                .store_string(artist)
                .unwrap()
                .build()
                .unwrap()
                .to_arc(),
        )
        .unwrap();
    message.store_reference(&dna.to_cell().to_arc()).unwrap();
    message.store_address(&TonAddress::NULL).unwrap();
    message.store_bit(false).unwrap();
    message.build().unwrap().to_boc_b64(true).unwrap()
}

pub fn pack_purchase_exclusive(item_index: u32) -> String {
    let mut message = CellBuilder::new();
    message.store_u32(32, 0x6480_907e).unwrap();
    message.store_u32(32, item_index).unwrap();
    message.build().unwrap().to_boc_b64(true).unwrap()
}
