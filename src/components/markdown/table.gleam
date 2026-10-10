import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html

pub fn view(children: List(Element(a))) -> Element(a) {
  html.div([attribute.class("na-table-wrapper")], [
    html.table(
      [
        attribute.class("na-table md"),
        attribute.styles([#("--text-align-cell", "center")]),
      ],
      children,
    ),
  ])
}
