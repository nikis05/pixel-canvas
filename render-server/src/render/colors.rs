use phf::phf_map;

pub static COLORS: phf::Map<u8, image::Rgb<u8>> = phf_map! {
    0u8 => image::Rgb([0, 0, 0])
};
