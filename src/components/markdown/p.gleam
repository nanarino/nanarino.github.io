import gleam/dict.{type Dict}
import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html

pub fn view(
  _attributes: Dict(String, String),
  children: List(Element(a)),
) -> Element(a) {
  html.p([attribute.class("na-paragraph na-font-serif")], children)
}
