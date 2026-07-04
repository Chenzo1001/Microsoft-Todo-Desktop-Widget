#[cfg(all(windows, not(debug_assertions)))]
pub fn apply(enabled: bool) {
    use windows_sys::Win32::System::Console::{AllocConsole, FreeConsole, GetConsoleWindow};

    unsafe {
        let has_console = !GetConsoleWindow().is_null();
        match (enabled, has_console) {
            (true, false) => {
                AllocConsole();
            }
            (false, true) => {
                FreeConsole();
            }
            _ => {}
        }
    }
}

#[cfg(any(not(windows), debug_assertions))]
pub fn apply(_enabled: bool) {}
