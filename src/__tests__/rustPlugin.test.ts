import { RustPlugin } from '@/plugins/rustPlugin';

describe('RustPlugin', () => {
  const plugin = new RustPlugin();

  describe('parseImports', () => {
    it('should parse simple use statements', () => {
      const content = `use std::collections::HashMap;`;
      const imports = plugin.parseImports(content, 'test.rs');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('std::collections');
      expect(imports[0].imports).toEqual(['HashMap']);
      expect(imports[0].isDefault).toBe(false);
    });

    it('should parse crate-relative use statements', () => {
      const content = `use crate::models::User;`;
      const imports = plugin.parseImports(content, 'test.rs');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('crate::models');
      expect(imports[0].imports).toEqual(['User']);
    });

    it('should parse super-relative use statements', () => {
      const content = `use super::config::Settings;`;
      const imports = plugin.parseImports(content, 'test.rs');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('super::config');
      expect(imports[0].imports).toEqual(['Settings']);
    });

    it('should parse nested use statements with braces', () => {
      const content = `use std::{io, fs};`;
      const imports = plugin.parseImports(content, 'test.rs');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('std');
      expect(imports[0].imports).toEqual(['io', 'fs']);
    });

    it('should parse nested use with qualified paths', () => {
      const content = `use crate::services::{AuthService, UserService};`;
      const imports = plugin.parseImports(content, 'test.rs');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('crate::services');
      expect(imports[0].imports).toEqual(['AuthService', 'UserService']);
    });

    it('should parse nested use with deeply qualified names', () => {
      const content = `use std::{io::Read, collections::HashMap};`;
      const imports = plugin.parseImports(content, 'test.rs');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('std');
      expect(imports[0].imports).toEqual(['Read', 'HashMap']);
    });

    it('should parse glob imports', () => {
      const content = `use super::config::*;`;
      const imports = plugin.parseImports(content, 'test.rs');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('super::config');
      expect(imports[0].imports).toEqual(['*']);
      expect(imports[0].isNamespace).toBe(true);
    });

    it('should parse multiple use statements', () => {
      const content = `use std::collections::HashMap;
use crate::models::User;
use super::*;`;
      const imports = plugin.parseImports(content, 'test.rs');
      expect(imports).toHaveLength(3);
    });

    it('should not parse commented-out use statements', () => {
      const content = `// use std::io;
use std::fs;`;
      const imports = plugin.parseImports(content, 'test.rs');
      expect(imports).toHaveLength(1);
      expect(imports[0].imports).toEqual(['fs']);
    });

    it('should handle single-segment use', () => {
      const content = `use serde;`;
      const imports = plugin.parseImports(content, 'test.rs');
      expect(imports).toHaveLength(1);
      expect(imports[0].source).toBe('serde');
      expect(imports[0].imports).toEqual(['serde']);
    });
  });

  describe('findUsedIdentifiers', () => {
    it('should detect PascalCase type usage', () => {
      const content = `let user = User::new();`;
      const ids = plugin.findUsedIdentifiers(content, 'test.rs');
      expect(ids.some(id => id.name === 'User')).toBe(true);
    });

    it('should detect qualified path usage', () => {
      const content = `let map = MyMap::with_capacity(10);`;
      const ids = plugin.findUsedIdentifiers(content, 'test.rs');
      expect(ids.some(id => id.name === 'MyMap')).toBe(true);
    });

    it('should detect custom macro usage', () => {
      const content = `my_custom_macro!(arg1, arg2);`;
      const ids = plugin.findUsedIdentifiers(content, 'test.rs');
      expect(ids.some(id => id.name === 'my_custom_macro')).toBe(true);
    });

    it('should not detect built-in types', () => {
      const content = `let v: Vec<String> = Vec::new();
let m: HashMap<String, i32> = HashMap::new();
let o: Option<bool> = Some(true);
let r: Result<(), Error> = Ok(());`;
      const ids = plugin.findUsedIdentifiers(content, 'test.rs');
      expect(ids.some(id => id.name === 'Vec')).toBe(false);
      expect(ids.some(id => id.name === 'String')).toBe(false);
      expect(ids.some(id => id.name === 'HashMap')).toBe(false);
      expect(ids.some(id => id.name === 'Option')).toBe(false);
      expect(ids.some(id => id.name === 'Some')).toBe(false);
      expect(ids.some(id => id.name === 'Result')).toBe(false);
      expect(ids.some(id => id.name === 'Ok')).toBe(false);
      expect(ids.some(id => id.name === 'Error')).toBe(false);
    });

    it('should not detect Rust keywords', () => {
      const content = `fn main() {
    let mut x = 5;
    if x > 0 {
        return;
    }
}`;
      const ids = plugin.findUsedIdentifiers(content, 'test.rs');
      expect(ids.some(id => id.name === 'fn')).toBe(false);
      expect(ids.some(id => id.name === 'let')).toBe(false);
      expect(ids.some(id => id.name === 'mut')).toBe(false);
      expect(ids.some(id => id.name === 'if')).toBe(false);
      expect(ids.some(id => id.name === 'return')).toBe(false);
    });

    it('should not detect built-in macros', () => {
      const content = `println!("hello");
vec![1, 2, 3];
format!("{}", x);
panic!("error");`;
      const ids = plugin.findUsedIdentifiers(content, 'test.rs');
      expect(ids.some(id => id.name === 'println')).toBe(false);
      expect(ids.some(id => id.name === 'vec')).toBe(false);
      expect(ids.some(id => id.name === 'format')).toBe(false);
      expect(ids.some(id => id.name === 'panic')).toBe(false);
    });

    it('should not detect identifiers on use lines', () => {
      const content = `use crate::models::User;
let x = 5;`;
      const ids = plugin.findUsedIdentifiers(content, 'test.rs');
      expect(ids.some(id => id.name === 'User')).toBe(false);
    });

    it('should not detect identifiers on struct/enum/trait definition lines', () => {
      const content = `struct MyStruct {
    field: i32,
}
enum MyEnum {
    A,
    B,
}
trait MyTrait {
    fn do_thing(&self);
}`;
      const ids = plugin.findUsedIdentifiers(content, 'test.rs');
      expect(ids.some(id => id.name === 'MyStruct')).toBe(false);
      expect(ids.some(id => id.name === 'MyEnum')).toBe(false);
      expect(ids.some(id => id.name === 'MyTrait')).toBe(false);
    });

    it('should not detect common method calls', () => {
      const content = `let v = items.collect();
let s = name.to_string();
let x = opt.unwrap();`;
      const ids = plugin.findUsedIdentifiers(content, 'test.rs');
      expect(ids.some(id => id.name === 'collect')).toBe(false);
      expect(ids.some(id => id.name === 'to_string')).toBe(false);
      expect(ids.some(id => id.name === 'unwrap')).toBe(false);
    });

    it('should not detect primitive types', () => {
      const content = `let x: i32 = 5;
let y: f64 = 3.14;
let z: bool = true;
let s: &str = "hello";`;
      const ids = plugin.findUsedIdentifiers(content, 'test.rs');
      expect(ids.some(id => id.name === 'i32')).toBe(false);
      expect(ids.some(id => id.name === 'f64')).toBe(false);
      expect(ids.some(id => id.name === 'bool')).toBe(false);
      expect(ids.some(id => id.name === 'str')).toBe(false);
    });

    it('should detect custom function calls', () => {
      const content = `let result = process_data(&items);`;
      const ids = plugin.findUsedIdentifiers(content, 'test.rs');
      expect(ids.some(id => id.name === 'process_data')).toBe(true);
    });

    it('should not detect fn definition names as identifiers', () => {
      const content = `fn process_data(items: &[i32]) -> Vec<i32> {
    items.to_vec()
}`;
      const ids = plugin.findUsedIdentifiers(content, 'test.rs');
      expect(ids.some(id => id.name === 'process_data')).toBe(false);
    });

    it('should detect trait name used in impl trait for struct (#35)', () => {
      const content = `impl Serialize for MyStruct {
    fn serialize(&self) {}
}`;
      const ids = plugin.findUsedIdentifiers(content, 'test.rs');
      expect(ids.some(id => id.name === 'Serialize')).toBe(true);
      expect(ids.some(id => id.name === 'MyStruct')).toBe(true);
    });

    it('should detect trait in generic impl (#35)', () => {
      const content = `impl<T> Deserialize<T> for Config {
    fn deserialize() -> T { todo!() }
}`;
      const ids = plugin.findUsedIdentifiers(content, 'test.rs');
      expect(ids.some(id => id.name === 'Deserialize')).toBe(true);
      expect(ids.some(id => id.name === 'Config')).toBe(true);
    });

    it('should detect lowercase module qualified paths (#41)', () => {
      const content = `let data = fs::read("file.txt").unwrap();
let addr = net::SocketAddr::new();`;
      const ids = plugin.findUsedIdentifiers(content, 'test.rs');
      expect(ids.some(id => id.name === 'fs')).toBe(true);
      expect(ids.some(id => id.name === 'net')).toBe(true);
    });

    it('should not detect keyword-prefixed qualified paths (#41)', () => {
      const content = `let x = self::helper();
let y = super::parent_fn();
let z = crate::root_fn();`;
      const ids = plugin.findUsedIdentifiers(content, 'test.rs');
      expect(ids.some(id => id.name === 'self')).toBe(false);
      expect(ids.some(id => id.name === 'super')).toBe(false);
      expect(ids.some(id => id.name === 'crate')).toBe(false);
    });

    it('should not detect identifiers inside strings after stripping (#36)', () => {
      const content = `let s = r##"use fake::Import; MyStruct"##;
let x = CustomType::new();`;
      const ids = plugin.findUsedIdentifiers(content, 'test.rs');
      expect(ids.some(id => id.name === 'Import')).toBe(false);
      expect(ids.some(id => id.name === 'MyStruct')).toBe(false);
      expect(ids.some(id => id.name === 'CustomType')).toBe(true);
    });
  });

  describe('parseExports', () => {
    it('should detect pub fn', () => {
      const content = `pub fn create_user(name: &str) -> User {
    User { name: name.to_string() }
}`;
      const exports = plugin.parseExports(content, '/project/src/models.rs');
      expect(exports.some(e => e.name === 'create_user')).toBe(true);
    });

    it('should detect pub async fn', () => {
      const content = `pub async fn fetch_data(url: &str) -> Result<String, Error> {
    Ok(String::new())
}`;
      const exports = plugin.parseExports(content, '/project/src/api.rs');
      expect(exports.some(e => e.name === 'fetch_data')).toBe(true);
    });

    it('should detect pub struct', () => {
      const content = `pub struct User {
    pub name: String,
    pub email: String,
}`;
      const exports = plugin.parseExports(content, '/project/src/models.rs');
      expect(exports.some(e => e.name === 'User')).toBe(true);
    });

    it('should detect pub enum', () => {
      const content = `pub enum Role {
    Admin,
    Editor,
    Viewer,
}`;
      const exports = plugin.parseExports(content, '/project/src/models.rs');
      expect(exports.some(e => e.name === 'Role')).toBe(true);
    });

    it('should detect pub trait', () => {
      const content = `pub trait Displayable {
    fn display(&self) -> String;
}`;
      const exports = plugin.parseExports(content, '/project/src/traits.rs');
      expect(exports.some(e => e.name === 'Displayable')).toBe(true);
    });

    it('should detect pub type alias', () => {
      const content = `pub type UserId = u64;`;
      const exports = plugin.parseExports(content, '/project/src/types.rs');
      expect(exports.some(e => e.name === 'UserId')).toBe(true);
      expect(exports.find(e => e.name === 'UserId')?.isType).toBe(true);
    });

    it('should detect pub const', () => {
      const content = `pub const MAX_USERS: usize = 1000;`;
      const exports = plugin.parseExports(content, '/project/src/config.rs');
      expect(exports.some(e => e.name === 'MAX_USERS')).toBe(true);
    });

    it('should detect pub static', () => {
      const content = `pub static DEFAULT_ROLE: &str = "viewer";`;
      const exports = plugin.parseExports(content, '/project/src/config.rs');
      expect(exports.some(e => e.name === 'DEFAULT_ROLE')).toBe(true);
    });

    it('should detect pub static mut', () => {
      const content = `pub static mut COUNTER: u32 = 0;`;
      const exports = plugin.parseExports(content, '/project/src/state.rs');
      expect(exports.some(e => e.name === 'COUNTER')).toBe(true);
    });

    it('should detect pub mod', () => {
      const content = `pub mod helpers {
    pub fn format_name() -> String { String::new() }
}`;
      const exports = plugin.parseExports(content, '/project/src/lib.rs');
      expect(exports.some(e => e.name === 'helpers')).toBe(true);
    });

    it('should detect pub(crate) items', () => {
      const content = `pub(crate) fn validate_token(token: &str) -> bool {
    !token.is_empty()
}`;
      const exports = plugin.parseExports(content, '/project/src/auth.rs');
      expect(exports.some(e => e.name === 'validate_token')).toBe(true);
    });

    it('should detect pub unsafe fn (#40)', () => {
      const content = `pub unsafe fn dangerous_op(ptr: *mut u8) {}`;
      const exports = plugin.parseExports(content, '/project/src/ffi.rs');
      expect(exports.some(e => e.name === 'dangerous_op')).toBe(true);
    });

    it('should detect pub const fn (#40)', () => {
      const content = `pub const fn max_value() -> u32 { u32::MAX }`;
      const exports = plugin.parseExports(content, '/project/src/constants.rs');
      expect(exports.some(e => e.name === 'max_value')).toBe(true);
    });

    it('should detect pub extern "C" fn (#40)', () => {
      const content = `pub extern "C" fn ffi_init(ctx: *mut Context) -> i32 { 0 }`;
      const exports = plugin.parseExports(content, '/project/src/ffi.rs');
      expect(exports.some(e => e.name === 'ffi_init')).toBe(true);
    });

    it('should detect pub unsafe extern "C" fn (#40)', () => {
      const content = `pub unsafe extern "C" fn raw_alloc(size: usize) -> *mut u8 { std::ptr::null_mut() }`;
      const exports = plugin.parseExports(content, '/project/src/alloc.rs');
      expect(exports.some(e => e.name === 'raw_alloc')).toBe(true);
    });

    it('should detect pub use re-exports (#42)', () => {
      const content = `pub use crate::models::User;
pub use crate::services::AuthService;`;
      const exports = plugin.parseExports(content, '/project/src/lib.rs');
      expect(exports.some(e => e.name === 'User')).toBe(true);
      expect(exports.some(e => e.name === 'AuthService')).toBe(true);
    });

    it('should detect pub use re-exports with braces (#42)', () => {
      const content = `pub use crate::models::{User, Role, Permission};`;
      const exports = plugin.parseExports(content, '/project/src/lib.rs');
      expect(exports.some(e => e.name === 'User')).toBe(true);
      expect(exports.some(e => e.name === 'Role')).toBe(true);
      expect(exports.some(e => e.name === 'Permission')).toBe(true);
    });

    it('should not detect private items (no pub)', () => {
      const content = `struct InternalCache {
    data: Vec<String>,
}

fn private_helper() -> bool {
    true
}

const INTERNAL_LIMIT: usize = 50;`;
      const exports = plugin.parseExports(content, '/project/src/internal.rs');
      expect(exports.some(e => e.name === 'InternalCache')).toBe(false);
      expect(exports.some(e => e.name === 'private_helper')).toBe(false);
      expect(exports.some(e => e.name === 'INTERNAL_LIMIT')).toBe(false);
    });

    it('should detect multiple pub items in one file', () => {
      const content = `pub struct User { pub name: String }
pub enum Role { Admin, Viewer }
pub fn create_user() -> User { User { name: String::new() } }
pub const MAX: usize = 100;
pub type Id = u64;
pub trait Validate { fn validate(&self) -> bool; }`;
      const exports = plugin.parseExports(content, '/project/src/models.rs');
      expect(exports).toHaveLength(6);
      expect(exports.map(e => e.name).sort()).toEqual(
        ['Id', 'MAX', 'Role', 'User', 'Validate', 'create_user']
      );
    });
  });

  describe('isBuiltInOrKeyword', () => {
    it('should return true for std types', () => {
      expect(plugin.isBuiltInOrKeyword('Vec')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('String')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('HashMap')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('Option')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('Result')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('Box')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('Rc')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('Arc')).toBe(true);
    });

    it('should return true for common traits', () => {
      expect(plugin.isBuiltInOrKeyword('Clone')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('Debug')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('Default')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('Display')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('Iterator')).toBe(true);
    });

    it('should return true for Rust keywords', () => {
      expect(plugin.isBuiltInOrKeyword('fn')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('let')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('mut')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('pub')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('struct')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('enum')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('impl')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('trait')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('Self')).toBe(true);
    });

    it('should return true for primitive types', () => {
      expect(plugin.isBuiltInOrKeyword('i32')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('u64')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('f64')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('bool')).toBe(true);
      expect(plugin.isBuiltInOrKeyword('usize')).toBe(true);
    });

    it('should return false for custom identifiers', () => {
      expect(plugin.isBuiltInOrKeyword('MyStruct')).toBe(false);
      expect(plugin.isBuiltInOrKeyword('process_data')).toBe(false);
      expect(plugin.isBuiltInOrKeyword('UserService')).toBe(false);
      expect(plugin.isBuiltInOrKeyword('AuthConfig')).toBe(false);
    });
  });

  describe('generateImportStatement', () => {
    it('should generate use crate:: statement from src-relative path', () => {
      const stmt = plugin.generateImportStatement('User', '/project/src/models/user.rs', false);
      expect(stmt).toBe('use crate::models::user::User;');
    });

    it('should handle mod.rs paths', () => {
      const stmt = plugin.generateImportStatement('User', '/project/src/models/mod.rs', false);
      expect(stmt).toBe('use crate::models::User;');
    });

    it('should handle lib.rs paths', () => {
      const stmt = plugin.generateImportStatement('Config', '/project/src/lib.rs', false);
      expect(stmt).toBe('use crate::Config;');
    });
  });

  describe('getImportInsertPosition', () => {
    it('should insert after last use line', () => {
      const content = `use std::io;
use std::fs;

fn main() {}`;
      const pos = plugin.getImportInsertPosition(content, 'test.rs');
      expect(pos).toBe(2);
    });

    it('should skip over comments at file start', () => {
      const content = `// Copyright 2024
// License: MIT

fn main() {}`;
      const pos = plugin.getImportInsertPosition(content, 'test.rs');
      expect(pos).toBe(3);
    });

    it('should skip over attributes', () => {
      const content = `#![allow(dead_code)]

use std::io;

fn main() {}`;
      const pos = plugin.getImportInsertPosition(content, 'test.rs');
      expect(pos).toBe(3);
    });

    it('should handle file with no use statements', () => {
      const content = `fn main() {
    println!("hello");
}`;
      const pos = plugin.getImportInsertPosition(content, 'test.rs');
      expect(pos).toBe(0);
    });

    it('should handle empty file', () => {
      const pos = plugin.getImportInsertPosition('', 'test.rs');
      expect(pos).toBe(1);
    });

    it('should handle pub use statements', () => {
      const content = `pub use crate::models::User;
use std::io;

fn main() {}`;
      const pos = plugin.getImportInsertPosition(content, 'test.rs');
      expect(pos).toBe(2);
    });
  });

  describe('insertImports', () => {
    it('should insert imports after existing use block', () => {
      const content = `use std::io;

fn main() {}`;
      const result = plugin.insertImports(content, ['use crate::models::User;'], 'test.rs');
      const lines = result.split('\n');
      expect(lines[0]).toBe('use std::io;');
      expect(lines[1]).toBe('use crate::models::User;');
      expect(lines[2]).toBe('');
    });

    it('should insert multiple imports', () => {
      const content = `use std::io;

fn main() {}`;
      const result = plugin.insertImports(
        content,
        ['use crate::models::User;', 'use crate::services::AuthService;'],
        'test.rs'
      );
      const lines = result.split('\n');
      expect(lines[1]).toBe('use crate::models::User;');
      expect(lines[2]).toBe('use crate::services::AuthService;');
    });

    it('should handle file with no existing imports', () => {
      const content = `fn main() {
    println!("hello");
}`;
      const result = plugin.insertImports(content, ['use crate::models::User;'], 'test.rs');
      expect(result.startsWith('use crate::models::User;')).toBe(true);
    });
  });

  describe('filePathToModule (private)', () => {
    const filePathToModule = (plugin as any).filePathToModule.bind(plugin);

    it('should convert src-relative paths to :: notation', () => {
      expect(filePathToModule('/project/src/models/user.rs')).toBe('models::user');
    });

    it('should handle mod.rs by stripping it', () => {
      expect(filePathToModule('/project/src/models/mod.rs')).toBe('models');
    });

    it('should handle lib.rs by stripping it', () => {
      expect(filePathToModule('/project/src/lib.rs')).toBe('');
    });

    it('should handle paths without src', () => {
      expect(filePathToModule('/project/mymod/utils.rs')).toBe('mymod::utils');
    });

    it('should strip .rs extension', () => {
      const result = filePathToModule('/project/src/module.rs');
      expect(result).not.toContain('.rs');
    });
  });

  describe('stripCommentsAndStrings (private)', () => {
    const strip = (plugin as any).stripCommentsAndStrings.bind(plugin);

    it('should strip regular strings', () => {
      const result = strip('let s = "hello world";');
      expect(result).not.toContain('hello world');
      expect(result).toContain('""');
    });

    it('should strip raw strings with matched hashes (#36)', () => {
      const result = strip('let s = r##"contains "quotes" and #hash"##;');
      expect(result).not.toContain('contains');
      expect(result).not.toContain('quotes');
      expect(result).toContain('""');
    });

    it('should strip raw strings with single hash (#36)', () => {
      const result = strip('let s = r#"raw string content"#;');
      expect(result).not.toContain('raw string content');
    });

    it('should strip raw strings with no hashes (#36)', () => {
      const result = strip('let s = r"raw no hash";');
      expect(result).not.toContain('raw no hash');
    });

    it('should not confuse different hash counts (#36)', () => {
      const input = 'let a = r##"first"##; let b = r#"second"#;';
      const result = strip(input);
      expect(result).not.toContain('first');
      expect(result).not.toContain('second');
    });

    it('should strip block comments', () => {
      const result = strip('let x = 5; /* comment */ let y = 10;');
      expect(result).not.toContain('comment');
    });

    it('should strip line comments', () => {
      const result = strip('let x = 5; // comment');
      expect(result).not.toContain('comment');
    });
  });

  describe('plugin metadata', () => {
    it('should have correct name', () => {
      expect(plugin.name).toBe('rust');
    });

    it('should support .rs extension', () => {
      expect(plugin.extensions).toEqual(['.rs']);
    });
  });
});
