use std::fmt;

pub struct User {
    pub name: String,
    pub email: String,
    pub age: u32,
}

pub enum Role {
    Admin,
    Editor,
    Viewer,
}

pub trait Displayable {
    fn display(&self) -> String;
}

pub type UserId = u64;

pub const MAX_USERS: usize = 1000;

pub static DEFAULT_ROLE: &str = "viewer";

pub fn create_user(name: &str, email: &str) -> User {
    User {
        name: name.to_string(),
        email: email.to_string(),
        age: 0,
    }
}

pub async fn fetch_user(id: UserId) -> Option<User> {
    None
}

pub mod helpers {
    pub fn format_name(first: &str, last: &str) -> String {
        format!("{} {}", first, last)
    }
}

impl fmt::Display for User {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{} <{}>", self.name, self.email)
    }
}

struct InternalCache {
    data: Vec<String>,
}

fn private_helper() -> bool {
    true
}
