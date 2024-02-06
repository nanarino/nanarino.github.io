%{
  site_name: "☘",
  site_description: "nanarino.art",
  date_format: "{WDfull}, {D} {Mshort} {YYYY}",
  base_url: "/",
  author: "kogawananari",
  author_email: "kogawananari@gmail.com",
  plugins: [
    {Serum.Plugins.LiveReloader, only: :dev}
  ],
  theme: Serum.Themes.Essence
}
