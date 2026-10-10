import components/heading
import gleam/dict.{type Dict}
import lustre/element.{type Element}

pub fn view(
  _attributes: Dict(String, String),
  id: String,
  children: List(Element(a)),
) -> Element(a) {
  heading.with_anchor("h3", "###", "-33deg", id, children)
}
