package models

import "time"

type User struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

type Config struct {
	Host string
	Port int
}

var (
	DefaultConfig  = Config{Host: "localhost", Port: 8080}
	MaxConnections = 100
)

const (
	StatusActive   = "active"
	StatusInactive = "inactive"
)

func NewUser(name, email string) *User {
	return &User{Name: name, Email: email}
}

func (u *User) Validate() error {
	return nil
}

func internalHelper() string {
	return "not exported"
}
