import components/markdown/a
import components/markdown/blockquote
import components/markdown/code
import components/markdown/h1
import components/markdown/h2
import components/markdown/h3
import components/markdown/h4
import components/markdown/h5
import components/markdown/h6
import components/markdown/hr
import components/markdown/img
import components/markdown/li
import components/markdown/p
import components/markdown/pre
import components/markdown/table
import components/markdown/td
import components/markdown/th
import components/markdown/tr
import maud/components.{type Components}

pub fn components() -> Components(msg) {
  components.default()
  |> components.a(a.view)
  |> components.h1(h1.view)
  |> components.h2(h2.view)
  |> components.h3(h3.view)
  |> components.h4(h4.view)
  |> components.h5(h5.view)
  |> components.h6(h6.view)
  |> components.hr(hr.view)
  |> components.p(p.view)
  |> components.blockquote(blockquote.view)
  |> components.code(code.view)
  |> components.pre(pre.view)
  |> components.table(table.view)
  |> components.tr(tr.view)
  |> components.td(td.view)
  |> components.th(th.view)
  |> components.img(img.view)
  |> components.li(li.view)
}
