import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html

pub fn view(children: List(Element(a))) -> Element(a) {
  html.li([attribute.class("na-list")], children)
}
