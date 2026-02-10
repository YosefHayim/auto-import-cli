use std::collections::HashMap;
use crate::models::User;
use crate::services::{AuthService, UserService};
use super::config::*;

fn main() {
    let mut users: HashMap<String, User> = HashMap::new();
    let auth = AuthService::new();
    let service = UserService::new();

    let result = process_data(&users);
    println!("Done: {:?}", result);
}

fn process_data(data: &HashMap<String, User>) -> Vec<String> {
    data.keys().cloned().collect()
}
