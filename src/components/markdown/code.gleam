import gleam/dict.{type Dict}
import gleam/option.{type Option, None, Some}
import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html

pub fn view(
  _attributes: Dict(String, String),
  language: Option(String),
  children: List(Element(a)),
) -> Element(a) {
  let attributes = case language {
    Some(language) -> [
      attribute.class("na-code"),
      attribute.attribute("data-language", language),
    ]
    None -> [attribute.class("na-code")]
  }

  html.code(attributes, children)
}
