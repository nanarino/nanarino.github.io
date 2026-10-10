import components/markdown/icon
import gleam/dict.{type Dict}
import gleam/option.{type Option, None, Some}
import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html

pub fn view(
  _attributes: Dict(String, String),
  src: String,
  alt: String,
  title: Option(String),
) -> Element(a) {
  let title = case title {
    Some(title) -> [attribute.title(title)]
    None -> []
  }

  html.span([attribute.class("na-image")], [
    html.img([
      attribute.src(src),
      attribute.alt(alt),
      attribute.attribute("ondragstart", "return false"),
      attribute.attribute(
        "onerror",
        "this.parentElement.dataset.error='';this.onerror=null",
      ),
      ..title
    ]),
    html.span([attribute.class("na-image-mask")], [
      icon.eye(src),
      icon.eye_invisible(),
    ]),
  ])
}
