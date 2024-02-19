%{
  site_name: "☘",
  site_description: "nanarino.art",
  date_format: "{WDfull}, {D} {Mshort} {YYYY}",
  base_url: "/",
  author: "kogawananari",
  author_email: "kogawananari@gmail.com",
  preview_length: 0,
  pagination: true,
  posts_per_page: 16,
  plugins: [
    {Serum.Plugins.LiveReloader, only: :dev}
  ],
  theme: Serum.Themes.Wired
}
