import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html
import maud/components.{type Alignment}

pub fn view(
  _alignment: Alignment,
  children: List(Element(a)),
) -> Element(a) {
  html.th([attribute.class("na-table-cell na-font-serif")], children)
}
