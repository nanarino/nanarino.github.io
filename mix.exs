defmodule Nanarino.Github.IO.MixFile do
  use Mix.Project

  def project do
    [
      app: :nanarino_github_io,
      version: "0.1.0",
      elixir: "~> 1.14",
      start_permanent: Mix.env == :prod,
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
    ]
  end
end
