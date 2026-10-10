import components/global_bg
import components/global_style
import components/markdown
import lustre
import lustre/effect.{type Effect}
import lustre/element.{type Element}
import lustre/element/html
import maud
import mork

const stylesheet = "index.css"

pub fn main() {
  global_style.register()
  let app = lustre.application(init, update, view)
  let assert Ok(_) = lustre.start(app, "#app", Nil)

  Nil
}

type Model {
  Loading
  Ready(String)
}

fn init(_) -> #(Model, Effect(Msg)) {
  #(Loading, load_markdown())
}

type Msg {
  MarkdownLoaded(String)
}

fn update(model: Model, msg: Msg) -> #(Model, Effect(Msg)) {
  case model, msg {
    _, MarkdownLoaded(markdown) -> #(Ready(markdown), effect.none())
  }
}

fn view(model: Model) -> Element(Msg) {
  let content = case model {
    Loading -> []
    Ready(markdown) ->
      maud.render_markdown(
        markdown,
        mork.configure() |> mork.heading_ids(True),
        markdown.components(),
      )
  }

  element.fragment([
    global_style.element(stylesheet),
    global_bg.element(),
    html.div([], content),
  ])
}

fn load_markdown() -> Effect(Msg) {
  effect.from(fn(dispatch) {
    fetch_markdown("index.md", fn(markdown) {
      dispatch(MarkdownLoaded(markdown))
    })
  })
}

@external(javascript, "./index_ffi.mjs", "fetchMarkdown")
fn fetch_markdown(path: String, callback: fn(String) -> Nil) -> Nil
