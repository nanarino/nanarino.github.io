import lustre/attribute
import lustre/element.{type Element}

pub fn fill_clover(rotation: String) -> Element(msg) {
  clover(
    rotation,
    "0 0 512 512",
    "currentColor",
    "none",
    "<path d='m88.667 248.569h138.69l-82.52-82.52c-5.711-5.711-6.237-15.015-.801-20.989 5.804-6.378 15.686-6.553 21.713-.525l82.821 82.821v-138.689c0-48.717-39.862-89.21-88.576-88.661-43.366.488-79.262 32.661-85.578 74.408-41.748 6.317-73.92 42.212-74.409 85.578-.551 48.714 39.942 88.577 88.66 88.577z'/>
<path d='m370.496 195.494-97.497 56.292c.009.009.018.018.027.027 1.804 1.804 4.052 3.102 6.516 3.762l120.862 32.379c47.182 12.64 96.742-15.461 108.85-62.782 10.778-42.126-11.067-85.238-49.861-102.188 4.75-42.396-22.112-83.167-64.545-94.534-46.767-12.529-95.009 15.326-107.538 62.093-5.803 21.661-8.742 43.989-8.742 66.413v56.979c33.369-19.269 76.927-44.421 76.927-44.421 7.175-4.142 16.348-1.684 20.49 5.49 4.143 7.174 1.685 16.347-5.489 20.49z'/>
<path d='m496.508 369.533c-71.755-.135-134.281-29.859-178.222-72.521l-29.058-7.784 7.741 28.896c49.21 47.975 119.42 81.409 200.031 81.409 8.546 0 15.422-7.146 14.98-15.789-.413-8.068-7.392-14.196-15.472-14.211z'/>
<path d='m251.785 272.998-56.292 97.497c-4.142 7.175-13.314 9.634-20.49 5.49-7.174-4.142-9.632-13.316-5.49-20.49l44.415-76.927h-58.065c-21.698 0-43.303 2.844-64.262 8.459-46.562 12.474-75.298 59.92-63.457 106.647 10.925 43.111 52.055 70.513 94.84 65.719 17.08 39.093 60.727 60.975 103.16 49.606 46.767-12.529 74.623-60.77 62.094-107.537l-32.652-121.88c-.667-2.49-1.978-4.761-3.801-6.584z'/>",
  )
}

pub fn outline_clover(rotation: String) -> Element(msg) {
  clover(
    rotation,
    "0 0 682.66669 682.66669",
    "none",
    "currentColor",
    "<g transform='matrix(1.3333333,0,0,-1.3333333,0,682.66667)'>
<g transform='translate(248.5693,263.4307)'><path d='m 0,0 c 0,0 26.703,-26.703 56.442,-56.442 50.915,-50.915 119.978,-79.522 191.989,-79.522'/></g>
<g transform='translate(248.5693,263.4307)'><path d='m 0,0 v 155.71 c 0,42.971 -34.889,77.859 -77.859,77.859 -42.971,0 -77.851,-34.888 -77.851,-77.859 -42.971,0 -77.859,-34.88 -77.859,-77.851 0,-42.97 34.888,-77.859 77.859,-77.859 z'/></g>
<g transform='translate(248.5693,263.4307)'><path d='m 0,0 -150.408,-40.303 c -41.509,-11.118 -66.171,-53.848 -55.052,-95.356 11.125,-41.508 53.847,-66.171 95.355,-55.052 11.118,-41.508 53.848,-66.171 95.356,-55.053 41.508,11.126 66.17,53.848 55.052,95.356 z'/></g>
<g transform='translate(248.5693,263.4307)'><path d='m 0,0 150.408,-40.303 c 41.509,-11.118 84.23,13.544 95.356,55.052 11.118,41.509 -13.545,84.238 -55.053,95.356 11.118,41.508 -13.544,84.229 -55.052,95.355 C 94.15,216.579 51.421,191.917 40.303,150.408 Z'/></g>
<g transform='translate(155.1416,356.8584)'><path d='M 0,0 93.428,-93.428'/></g>
<g transform='translate(182.5029,149.0039)'><path d='M 0,0 66.066,114.427'/></g>
<g transform='translate(362.9956,329.4966)'><path d='M 0,0 -114.426,-66.066'/></g>
</g>",
  )
}

pub fn eye(src: String) -> Element(msg) {
  element.unsafe_raw_html(
    "http://www.w3.org/2000/svg",
    "svg",
    [
      attribute.attribute("viewBox", "0 0 48 48"),
      attribute.attribute("fill", "none"),
      attribute.attribute("stroke", "currentColor"),
      attribute.attribute("stroke-width", "4"),
      attribute.attribute("role", "button"),
      attribute.attribute("aria-label", "Open the image in a new tab"),
      attribute.attribute("data-icon", "interactive-button/outline/eye"),
      attribute.attribute("onclick", "window.open('" <> src <> "')"),
      icon_size(),
    ],
    "<path fill-rule='evenodd' clip-rule='evenodd' d='M24 37C30.6274 37 36.6274 32.6667 42 24C36.6274 15.3333 30.6274 11 24 11C17.3726 11 11.3726 15.3333 6 24C11.3726 32.6667 17.3726 37 24 37Z' stroke-linecap='butt'></path><path d='M29 24C29 26.7614 26.7614 29 24 29C21.2386 29 19 26.7614 19 24C19 21.2386 21.2386 19 24 19C26.7614 19 29 21.2386 29 24Z' stroke-linecap='butt'></path>",
  )
}

pub fn eye_invisible() -> Element(msg) {
  element.unsafe_raw_html(
    "http://www.w3.org/2000/svg",
    "svg",
    [
      attribute.attribute("viewBox", "0 0 48 48"),
      attribute.attribute("fill", "none"),
      attribute.attribute("stroke", "currentColor"),
      attribute.attribute("stroke-width", "4"),
      attribute.attribute("role", "note"),
      attribute.attribute("aria-label", "The image failed to load"),
      attribute.attribute("aria-disabled", "true"),
      attribute.attribute("data-icon", "interactive-button/outline/eye-invisible"),
      icon_size(),
    ],
    "<path d='M14 14.5C11.3096 16.5 8.58489 19.8302 6 24C11.3726 32.6667 17.3726 37 24 37C27.3245 37 30.4912 35.9096 33.5 33.7287M17.4635 12.5C19 11 21.7488 11 24 11C30.6274 11 36.6274 15.3333 42 24C40.2344 26.8481 38.4011 29.2282 36.5 31.1404' stroke-linecap='butt'></path><path d='M29 24C29 26.7614 26.7614 29 24 29C21.2386 29 19 26.7614 19 24C19 21.2386 21.2386 19 24 19C26.7614 19 29 21.2386 29 24Z' stroke-linecap='butt'></path><path d='M6.85156 7.10254L41.1462 41.3972' stroke-linecap='butt'></path>",
  )
}

fn clover(
  rotation: String,
  view_box: String,
  fill: String,
  stroke: String,
  paths: String,
) -> Element(msg) {
  element.unsafe_raw_html(
    "http://www.w3.org/2000/svg",
    "svg",
    [
      attribute.attribute("viewBox", view_box),
      attribute.attribute("fill", fill),
      attribute.attribute("stroke", stroke),
      attribute.attribute("stroke-width", "30"),
      attribute.attribute("stroke-linecap", "round"),
      attribute.attribute("stroke-linejoin", "round"),
      attribute.styles([
        #("width", "1em"),
        #("height", "1em"),
        #("transform", "rotate(" <> rotation <> ") rotateY(180deg)"),
      ]),
    ],
    paths,
  )
}

fn icon_size() -> attribute.Attribute(msg) {
  attribute.styles([#("width", "24px"), #("height", "24px")])
}
