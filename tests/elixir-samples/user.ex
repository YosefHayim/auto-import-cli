defmodule MyApp.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset
  alias MyApp.Accounts.Profile

  schema "users" do
    field :name, :string
    field :email, :string
    has_one :profile, Profile

    timestamps()
  end

  def changeset(user, attrs) do
    user
    |> cast(attrs, [:name, :email])
    |> validate_required([:name, :email])
    |> unique_constraint(:email)
  end

  def active_users(query) do
    from(u in query, where: u.active == true)
  end
end
