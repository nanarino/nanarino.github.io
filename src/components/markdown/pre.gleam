import gleam/dict.{type Dict}
import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html

pub fn view(
  attributes: Dict(String, String),
  children: List(Element(a)),
) -> Element(a) {
  let language = case dict.get(attributes, "data-language") {
    Ok(language) -> [attribute.attribute("data-language", language)]
    Error(_) -> []
  }

  html.section(
    [
      attribute.class("na-watermark"),
      attribute.styles([
        #("--border-radius-watermark", "var(--border-radius-md)"),
      ]),
    ],
    [
      html.pre([attribute.class("na-pre"), ..language], children),
    ],
  )
}
