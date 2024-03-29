defmodule Nanarino.Page do
  use Mix.Project

  def project do
    [
      app: :nanarino_page,
      version: "0.2.0",
      elixir: "~> 1.16",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  def application do
    []
  end

  defp deps do
    [
      {:serum, git: "https://github.com/Dalgona/Serum.git", branch: "v1/master" },
      {:serum_theme_wired, git: "https://github.com/holy-two/serum-theme-wired.git", branch: "main" }
    ]
  end
end
