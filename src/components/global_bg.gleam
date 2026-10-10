import lustre/attribute
import lustre/element.{type Element}
import lustre/element/html

const css = "
:root {
  scroll-timeline-name: --bg-scroll;
  scroll-timeline-axis: block;
}
#bg {
  pointer-events: none;
  --bg-gap: 0.2em;
  --bg-black: calc(1em - var(--bg-gap));
  --bg-inset: calc(var(--bg-gap) / 2);
}
#bg::before,
#bg::after {
  content: \"\";
  position: fixed;
  z-index: -1;
  top: 50%;
  left: 50%;
  width: 200vmax;
  height: 200vmax;
  transform: translate(-50%, -50%) rotate(45deg);
  pointer-events: none;
  background-image:
    conic-gradient(
      from 270deg at var(--bg-black) var(--bg-black),
      var(--bg-color, #1111) 0deg 90deg,
      transparent 90deg
    ),
    conic-gradient(
      from 270deg at var(--bg-black) var(--bg-black),
      var(--bg-color, #1111) 0deg 90deg,
      transparent 90deg
    );
  background-size: 2em 2em;
  background-position:
    var(--bg-inset) var(--bg-inset),
    calc(1em + var(--bg-inset)) calc(1em + var(--bg-inset));
  background-repeat: repeat;
  animation-duration: auto;
  animation-timing-function: linear;
  animation-fill-mode: both;
  animation-timeline: --bg-scroll;
}
#bg::before {
  animation-name: bg-before;
}
#bg::after {
  animation-name: bg-after;
}
@keyframes bg-before {
  from {
    transform: translate(-50%, -50%) rotate(43deg);
    transform-origin: calc(50% - 1em) calc(50% + 0.6em);
  }
  to {
    transform: translate(-50%, -50%) rotate(47deg);
    transform-origin: calc(50% + 1em) calc(50% - 0.6em);
  }
}
@keyframes bg-after {
  from {
    transform: translate(-50%, -50%) rotate(47deg);
    transform-origin: calc(50% + 0.6em) calc(50% + 1em);
  }
  to {
    transform: translate(-50%, -50%) rotate(43deg);
    transform-origin: calc(50% - 0.6em) calc(50% - 1em);
  }
}
"

pub fn element() -> Element(msg) {
  element.fragment([
    element.element("style", [], [html.text(css)]),
    html.div([attribute.id("bg")], []),
  ])
}
