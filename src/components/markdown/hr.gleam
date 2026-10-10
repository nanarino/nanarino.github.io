import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html

pub fn view() -> Element(msg) {
  html.hr([attribute.class("na-divider")])
}
