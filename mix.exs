defmodule Nanarinoage.MixFile do
  use Mix.Project

  def project do
    [
      app: :nanarinopage,
      version: "0.1.0",
      elixir: "~> 1.14",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  def application do
    [
      applications: [:serum]
    ]
  end

  defp deps do
    [
      {:serum, "~> 1.5"},
      {:serum_theme_essence, "~> 1.0"}
    ]
  end
end
