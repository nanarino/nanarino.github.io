import components/markdown/icon
import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html

pub fn with_anchor(
  tag: String,
  marks: String,
  rotation: String,
  id: String,
  children: List(Element(a)),
) -> Element(a) {
  element.element(
    tag,
    [attribute.class("na-title na-font-serif"), attribute.id(id)],
    [
      html.a(
        [
          attribute.class("na-link na-cannot-select"),
          attribute.href("#" <> id),
          attribute.styles([#("margin-right", "0.2em")]),
        ],
        [
          icon.outline_clover(rotation),
          html.span([attribute.styles([#("font-size", "0")])], [
            html.text(marks),
          ]),
        ],
      ),
      ..children
    ],
  )
}
