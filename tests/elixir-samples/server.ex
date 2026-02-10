defmodule MyApp.Worker.Server do
  use GenServer
  require Logger
  alias MyApp.Accounts.User
  alias MyApp.Cache.Store, as: CacheStore

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def init(state) do
    Logger.info("Server started")
    {:ok, state}
  end

  def handle_call(:get_users, _from, state) do
    users = User.active_users(User)
    {:reply, users, state}
  end

  defp do_internal_work(data) do
    Enum.map(data, &process_item/1)
  end
end
