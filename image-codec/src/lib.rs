#![forbid(unused_must_use)]
#![warn(clippy::pedantic)]

use itertools::Itertools;
use js_sys::{Array, Number, Uint8Array};
use num_traits::ToPrimitive;
use wasm_bindgen::{JsValue, prelude::wasm_bindgen};

use crate::dna::Dna;

mod dna;
mod parse;
mod render;

#[wasm_bindgen(typescript_custom_section)]
const PARSE_IMAGE_RESPONSE_TYPEDEF: &'static str = r#"
export type ParseImageResponse = {
  status: "ok",
  data: number[][], 
} | {
  status: "unsupported_extension" | "decode_error" | "wrong_dimensions" | "wrong_palette"
}"#;

#[wasm_bindgen(skip_typescript, getter_with_clone)]
pub struct ParseImageResponse {
    pub status: String,
    pub data: JsValue,
}

#[wasm_bindgen]
#[allow(clippy::must_use_candidate, clippy::needless_pass_by_value)]
pub fn parse_image(ext: String, bytes: Uint8Array) -> ParseImageResponse {
    let bytes = bytes.to_vec();
    parse::parse(&ext, &bytes)
}

#[wasm_bindgen(unchecked_return_type = "Uint8Array<ArrayBuffer>")]
#[allow(
    clippy::must_use_candidate,
    clippy::needless_pass_by_value,
    clippy::missing_panics_doc
)]
pub fn render_image(
    #[wasm_bindgen(unchecked_param_type = "number[][]")] data: Array,
    upscale: bool,
) -> Uint8Array {
    let data = data
        .to_vec()
        .into_iter()
        .map(|inner| {
            Array::from(&inner)
                .to_vec()
                .into_iter()
                .map(|value| value.as_f64().unwrap().to_u8().unwrap())
                .collect_vec()
        })
        .collect_vec();
    let bytes = render::render(&data, upscale);

    Uint8Array::new_from_slice(&bytes)
}

#[wasm_bindgen(unchecked_return_type = "number[][] | null")]
#[allow(clippy::must_use_candidate, clippy::needless_pass_by_value)]
pub fn decode_dna(dna: String) -> Option<Array> {
    Some(
        Dna::from_base64(&dna)?
            .to_data()
            .into_iter()
            .map(|row| row.into_iter().map(Number::from).collect::<Array>())
            .collect::<Array>(),
    )
}

#[wasm_bindgen]
#[allow(
    clippy::must_use_candidate,
    clippy::needless_pass_by_value,
    clippy::missing_panics_doc
)]
pub fn encode_dna(#[wasm_bindgen(unchecked_param_type = "number[][]")] data: Array) -> String {
    let data = data
        .to_vec()
        .into_iter()
        .map(|row| {
            Array::from(&row)
                .to_vec()
                .into_iter()
                .map(|value| value.as_f64().unwrap().to_u8().unwrap())
                .collect_vec()
        })
        .collect_vec();

    Dna::from_data(data).to_base64()
}
