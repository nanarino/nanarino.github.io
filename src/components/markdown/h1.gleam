// import components/markdown/icon
import gleam/dict.{type Dict}
import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html

pub fn view(
  _attributes: Dict(String, String),
  _id: String,
  children: List(Element(a)),
) -> Element(a) {
  // icon.fill_clover("-76deg"),
  html.h1([attribute.class("na-title na-font-serif")], children)
}
