use hex::FromHex;
use proc_macro2::Span;
use quote::quote;
use serde::Deserialize;
use syn::LitInt;

#[derive(Deserialize)]
struct Data(Vec<String>);

#[proc_macro]
pub fn colors(input: proc_macro::TokenStream) -> proc_macro::TokenStream {
    if !input.is_empty() {
        return syn::Error::new(Span::call_site(), "No inputs expected")
            .into_compile_error()
            .into();
    }
    let file = include_bytes!("../../palette.json");
    let data = serde_json::from_slice::<Data>(file).unwrap();

    let items = data.0.into_iter().enumerate().map(|(index, color_hex)| {
        let color_value = <[u8; 3]>::from_hex(color_hex).unwrap();

        let lit_int = |value| LitInt::new(&format!("{}u8", value), Span::call_site());
        let index_lit = lit_int(index as u8);
        let ch1_lit = lit_int(color_value[0]);
        let ch2_lit = lit_int(color_value[1]);
        let ch3_lit = lit_int(color_value[2]);

        quote! {
            #index_lit => ::image::Rgb([#ch1_lit, #ch2_lit, #ch3_lit])
        }
    });

    let output = quote! {
        ::phf::phf_map! {
            #( #items ),*
        }
    };

    output.into()
}
