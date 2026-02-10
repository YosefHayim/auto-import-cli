package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
)

type UserHandler struct {
	service UserService
}

type Response struct {
	Status  int    `json:"status"`
	Message string `json:"message"`
}

func NewUserHandler(svc UserService) *UserHandler {
	return &UserHandler{service: svc}
}

func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/users/")
	user := h.service.FindByID(id)
	json.NewEncoder(w).Encode(user)
}

var DefaultTimeout = 30

const MaxRetries = 3
