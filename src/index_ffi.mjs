function resolve(path) {
  return new URL(path, document.baseURI)
}

function fetchText(url) {
  return fetch(url, { cache: "no-store" }).then(response => response.text())
}

export function fetchMarkdown(path, callback) {
  void fetchText(resolve(path)).then(callback)
}

export function injectStylesheet(path) {
  if (!path) return

  const url = resolve(path).href
  let style = [...document.querySelectorAll("style[data-stylesheet]")].find(
    element => element.dataset.stylesheet === url,
  )
  if (!style) {
    style = document.createElement("style")
    style.dataset.stylesheet = url
  }
  // After #app, so this sheet wins ties against the primary <style> inside it.
  document.body.append(style)

  void fetchText(url).then(css => {
    style.textContent = css
  })
}
