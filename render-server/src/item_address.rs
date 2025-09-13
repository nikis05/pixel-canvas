use std::sync::LazyLock;

use num_bigint::BigUint;
use tonlib_core::{TonAddress, cell::ArcCell, tlb_types::tlb::TLB};

static CODE: LazyLock<ArcCell> =
    LazyLock::new(|| ArcCell::from_boc_b64(include_str!("../item_code.base64")).unwrap());

pub fn item_address(collection_address: &str, index: u32) -> TonAddress {
    let mut data = tonlib_core::cell::CellBuilder::new();
    data.store_bit(false).unwrap();
    data.store_address(
        &TonAddress::from_base64_url_flags(collection_address)
            .unwrap()
            .0,
    )
    .unwrap();
    data.store_uint(257, &BigUint::from(index)).unwrap();
    let data = data.build().unwrap();

    TonAddress::derive(0, CODE.clone(), data.to_arc()).unwrap()
}
