import gleam/float
import gleam/int
import gleam/list
import gleam/string
import lustre
import lustre/attribute
import lustre/component
import lustre/effect.{type Effect}
import lustre/element.{type Element}
import lustre/element/html

pub fn register() -> Nil {
  let _ = lustre.register(app(), "global-style")
  Nil
}

pub fn element(href: String) -> Element(msg) {
  element.fragment([
    element.element("style", [], [html.text(primary_style())]),
    element.element("global-style", [attribute.href(href)], []),
  ])
}

fn app() {
  lustre.component(init, update, view, [
    component.on_attribute_change("href", fn(href) { Ok(HrefChanged(href)) }),
  ])
}

fn init(_) -> #(Nil, Effect(Msg)) {
  #(Nil, effect.none())
}

fn primary_style() -> String {
  "@import \"https://ga.jspm.io/npm:@nanarino/stylus@2.0.2/dist/style.min.css\";"
  <> ":root {color: var(--color, oklch(0.4 0.15 var(--hue-primary)));}"
}

fn range(from: Int, to: Int) -> List(Int) {
  case from > to {
    True -> []
    False -> [from, ..range(from + 1, to)]
  }
}

type Msg {
  HrefChanged(String)
}

fn update(_model: Nil, msg: Msg) -> #(Nil, Effect(Msg)) {
  case msg {
    HrefChanged(href) -> #(Nil, inject(href))
  }
}

fn view(_model: Nil) -> Element(Msg) {
  element.none()
}

fn inject(href: String) -> Effect(Msg) {
  effect.from(fn(_) { inject_stylesheet(href) })
}

@external(javascript, "../index_ffi.mjs", "injectStylesheet")
fn inject_stylesheet(path: String) -> Nil
