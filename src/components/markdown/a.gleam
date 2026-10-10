import gleam/dict.{type Dict}
import gleam/option.{type Option}
import gleam/string
import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html

pub fn view(
  _attributes: Dict(String, String),
  href: String,
  _title: Option(String),
  children: List(Element(a)),
) -> Element(a) {
  let #(href, target) = case string.starts_with(href, "/") {
    True -> #(string.drop_start(href, 1), "_self")
    False -> #(href, "_blank")
  }
  html.a(
    [
      attribute.class("na-link"),
      attribute.href(href),
      attribute.target(target),
      attribute.styles([#("--background-color-code", "0 0 0 / 0")]),
    ],
    children,
  )
}
