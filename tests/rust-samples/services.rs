use std::sync::Arc;
use crate::models::{User, Role, Displayable};

pub struct AuthService {
    secret: String,
}

pub struct UserService {
    users: Vec<User>,
}

pub(crate) fn validate_token(token: &str) -> bool {
    !token.is_empty()
}

pub const API_VERSION: &str = "v1";

pub type ServiceResult<T> = Result<T, Box<dyn std::error::Error>>;

impl AuthService {
    pub fn new() -> Self {
        AuthService {
            secret: String::from("secret"),
        }
    }

    pub fn authenticate(&self, user: &User) -> bool {
        !user.email.is_empty()
    }
}

impl UserService {
    pub fn new() -> Self {
        UserService { users: Vec::new() }
    }

    pub fn add_user(&mut self, user: User) {
        self.users.push(user);
    }

    pub fn find_by_role(&self, role: &Role) -> Vec<&User> {
        Vec::new()
    }
}
