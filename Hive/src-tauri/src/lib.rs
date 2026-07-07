use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize)]
pub struct TerminalOutput {
    pub pane_id: String,
    pub data: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TerminalInput {
    pub pane_id: String,
    pub data: String,
}

struct PtySystem {
    ptys: Mutex<HashMap<String, portable_pty::PtyPair>>,
}

#[tauri::command]
async fn spawn_terminal(
    pane_id: String,
    command: String,
    args: Vec<String>,
    state: State<'_, PtySystem>,
) -> Result<String, String> {
    let pty_system = native_pty_system();
    
    let mut cmd = CommandBuilder::new(command);
    for arg in args {
        cmd.arg(&arg);
    }
    
    let pty_pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;
    
    let mut child = pty_pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| e.to_string())?;
    
    // Drop the slave handle to let the child run independently
    drop(pty_pair.slave);
    
    let mut ptys = state.ptys.lock().unwrap();
    ptys.insert(pane_id.clone(), pty_pair);
    
    Ok(pane_id)
}

#[tauri::command]
async fn write_to_terminal(
    input: TerminalInput,
    state: State<'_, PtySystem>,
) -> Result<(), String> {
    let mut ptys = state.ptys.lock().unwrap();
    if let Some(pty_pair) = ptys.get_mut(&input.pane_id) {
        pty_pair
            .master
            .write_all(input.data.as_bytes())
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn resize_terminal(
    pane_id: String,
    rows: u16,
    cols: u16,
    state: State<'_, PtySystem>,
) -> Result<(), String> {
    let mut ptys = state.ptys.lock().unwrap();
    if let Some(pty_pair) = ptys.get_mut(&pane_id) {
        pty_pair
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let pty_system = PtySystem {
        ptys: Mutex::new(HashMap::new()),
    };

    tauri::Builder::default()
        .manage(pty_system)
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            spawn_terminal,
            write_to_terminal,
            resize_terminal
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
