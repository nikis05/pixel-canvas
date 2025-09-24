#![forbid(unused_must_use)]
#![warn(clippy::pedantic)]

use hex::FromHex;
use proc_macro2::Span;
use quote::quote;
use serde::Deserialize;
use std::sync::LazyLock;
use syn::LitInt;

#[proc_macro]
pub fn colors(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
    colors_map(&input, false)
}

#[proc_macro]
pub fn codes(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
    colors_map(&input, true)
}

#[derive(Deserialize)]
struct Data(Vec<String>);

static CODES: LazyLock<Data> = LazyLock::new(|| {
    let file = include_bytes!("../../palette.json");
    serde_json::from_slice::<Data>(file).unwrap()
});

fn colors_map(input: &proc_macro::TokenStream, inverse: bool) -> proc_macro::TokenStream {
    if !input.is_empty() {
        return syn::Error::new(Span::call_site(), "No inputs expected")
            .into_compile_error()
            .into();
    }

    let items = CODES.0.iter().enumerate().map(|(index, color_hex)| {
        let color_value = <[u8; 3]>::from_hex(color_hex).unwrap();

        let lit_int = |value| LitInt::new(&format!("{value}u8"), Span::call_site());
        let index_lit = lit_int(u8::try_from(index).unwrap());
        let ch1_lit = lit_int(color_value[0]);
        let ch2_lit = lit_int(color_value[1]);
        let ch3_lit = lit_int(color_value[2]);

        if inverse {
            quote! {
                [#ch1_lit, #ch2_lit, #ch3_lit] => #index_lit
            }
        } else {
            quote! {
                #index_lit => ::image::Rgb([#ch1_lit, #ch2_lit, #ch3_lit])
            }
        }
    });

    let output = quote! {
        ::phf::phf_map! {
            #( #items ),*
        }
    };

    output.into()
}
