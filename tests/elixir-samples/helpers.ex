defmodule MyApp.Helpers do
  def format_name(first, last) do
    "#{first} #{last}"
  end

  def calculate_total(items) do
    Enum.reduce(items, 0, fn item, acc -> acc + item.price end)
  end

  defp internal_helper(value) do
    String.trim(value)
  end

  defmacro debug_log(msg) do
    quote do
      IO.puts("[DEBUG] #{unquote(msg)}")
    end
  end
end
