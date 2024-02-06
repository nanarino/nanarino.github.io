%{
  site_name: "nanarino",
  site_description: "Rhythm game enthusiast and Painter without talent",
  date_format: "{WDfull}, {D} {Mshort} {YYYY}",
  base_url: "/",
  author: "kogawananari",
  author_email: "kogawananari@gmail.com",
  plugins: [
    {Serum.Plugins.LiveReloader, only: :dev}
  ]
}
