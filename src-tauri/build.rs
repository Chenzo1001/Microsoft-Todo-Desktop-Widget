fn main() {
    println!("cargo:rerun-if-env-changed=MICROSOFT_CLIENT_ID");
    println!("cargo:rerun-if-env-changed=MICROSOFT_TENANT");
    tauri_build::build()
}
