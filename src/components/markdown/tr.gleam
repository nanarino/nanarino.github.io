import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html

pub fn view(children: List(Element(a))) -> Element(a) {
  html.tr([attribute.class("na-table-row")], children)
}
