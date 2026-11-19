use serde::Serialize;
use serde_json::Value;
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{Manager, State, WindowEvent};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SidecarStatusDto {
    pub running: bool,
    pub pid: Option<u32>,
    pub port: Option<u16>,
    pub base_url: Option<String>,
    pub mcp_url: Option<String>,
    pub executable_path: Option<String>,
    pub recovered_tasks: usize,
    pub recovered_workspaces: usize,
    pub last_error: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SidecarBootstrapDto {
    pub running: bool,
    pub base_url: String,
    pub mcp_url: String,
    pub ui_token: String,
    pub pid: u32,
    pub port: u16,
}

struct ManagedSidecar {
    child: Child,
    pid: u32,
    port: u16,
    base_url: String,
    mcp_url: String,
    ui_token: String,
    executable_path: String,
    recovered_tasks: usize,
    recovered_workspaces: usize,
}

pub struct SidecarSupervisor {
    inner: Mutex<Option<ManagedSidecar>>,
    last_error: Mutex<Option<String>>,
}

impl Default for SidecarSupervisor {
    fn default() -> Self {
        Self {
            inner: Mutex::new(None),
            last_error: Mutex::new(None),
        }
    }
}

impl SidecarSupervisor {
    fn generate_ui_token() -> String {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let pid = std::process::id() as u128;
        format!("cw_tauri_{:x}_{:x}", nanos, pid ^ 0x9e37_79b9_7f4a_7c15)
    }

    fn resolve_sidecar_executable() -> Option<PathBuf> {
        let triple_name = "cloud-workspace-core-x86_64-pc-windows-msvc.exe";
        let plain_name = "cloud-workspace-core.exe";

        if let Ok(exe) = std::env::current_exe() {
            if let Some(dir) = exe.parent() {
                for candidate_name in [plain_name, triple_name] {
                    let candidate = dir.join(candidate_name);
                    if candidate.exists() {
                        return Some(candidate);
                    }
                }
            }
        }

        let dev_candidate = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("binaries")
            .join(triple_name);
        if dev_candidate.exists() {
            return Some(dev_candidate);
        }
        None
    }

    pub fn stop(&self) {
        if let Ok(mut guard) = self.inner.lock() {
            if let Some(mut proc_handle) = guard.take() {
                // Dropping stdin signals clean shutdown before force kill fallback
                drop(proc_handle.child.stdin.take());
                let _ = proc_handle.child.kill();
                let _ = proc_handle.child.wait();
            }
        }
    }

    pub fn start(&self) -> Result<SidecarStatusDto, String> {
        self.stop();

        let exe_path = Self::resolve_sidecar_executable().ok_or_else(|| {
            let msg = "Executável sidecar cloud-workspace-core não encontrado. Execute `npm run sidecar:build`."
                .to_string();
            if let Ok(mut err_guard) = self.last_error.lock() {
                *err_guard = Some(msg.clone());
            }
            msg
        })?;

        let ui_token = Self::generate_ui_token();
        let mut cmd = Command::new(&exe_path);
        cmd.args(["--port", "0", "--ui-token", &ui_token])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        #[cfg(target_os = "windows")]
        cmd.creation_flags(CREATE_NO_WINDOW);

        let mut child = cmd.spawn().map_err(|e| {
            let msg = format!("Falha ao iniciar sidecar: {e}");
            if let Ok(mut err_guard) = self.last_error.lock() {
                *err_guard = Some(msg.clone());
            }
            msg
        })?;

        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "Stdout do sidecar indisponível.".to_string())?;

        let mut reader = BufReader::new(stdout);
        let mut ready_line = String::new();
        reader
            .read_line(&mut ready_line)
            .map_err(|e| format!("Falha ao ler handshake do sidecar: {e}"))?;

        let parsed: Value = serde_json::from_str(ready_line.trim())
            .map_err(|e| format!("Handshake JSON inválido do sidecar: {e}"))?;

        let port = parsed
            .get("port")
            .and_then(|v| v.as_u64())
            .ok_or_else(|| "Porta ausente no handshake do sidecar.".to_string())?
            as u16;
        let base_url = parsed
            .get("baseUrl")
            .and_then(|v| v.as_str())
            .ok_or_else(|| "baseUrl ausente no handshake do sidecar.".to_string())?
            .to_string();
        let mcp_url = parsed
            .get("mcpUrl")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let recovered_tasks = parsed
            .get("recoveredTasks")
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as usize;
        let recovered_workspaces = parsed
            .get("recoveredWorkspaces")
            .and_then(|v| v.as_u64())
            .unwrap_or(0) as usize;

        let pid = child.id();
        let exe_str = exe_path.to_string_lossy().to_string();

        if let Ok(mut guard) = self.inner.lock() {
            *guard = Some(ManagedSidecar {
                child,
                pid,
                port,
                base_url: base_url.clone(),
                mcp_url: mcp_url.clone(),
                ui_token,
                executable_path: exe_str.clone(),
                recovered_tasks,
                recovered_workspaces,
            });
        }
        if let Ok(mut err_guard) = self.last_error.lock() {
            *err_guard = None;
        }

        Ok(SidecarStatusDto {
            running: true,
            pid: Some(pid),
            port: Some(port),
            base_url: Some(base_url),
            mcp_url: Some(mcp_url),
            executable_path: Some(exe_str),
            recovered_tasks,
            recovered_workspaces,
            last_error: None,
        })
    }

    pub fn status(&self) -> SidecarStatusDto {
        let err = self.last_error.lock().ok().and_then(|g| g.clone());
        if let Ok(mut guard) = self.inner.lock() {
            if let Some(ref mut proc_handle) = *guard {
                if let Ok(Some(_)) = proc_handle.child.try_wait() {
                    *guard = None;
                    return SidecarStatusDto {
                        running: false,
                        pid: None,
                        port: None,
                        base_url: None,
                        mcp_url: None,
                        executable_path: None,
                        recovered_tasks: 0,
                        recovered_workspaces: 0,
                        last_error: Some("Sidecar encerrado inesperadamente; use Reiniciar.".to_string()),
                    };
                }
                return SidecarStatusDto {
                    running: true,
                    pid: Some(proc_handle.pid),
                    port: Some(proc_handle.port),
                    base_url: Some(proc_handle.base_url.clone()),
                    mcp_url: Some(proc_handle.mcp_url.clone()),
                    executable_path: Some(proc_handle.executable_path.clone()),
                    recovered_tasks: proc_handle.recovered_tasks,
                    recovered_workspaces: proc_handle.recovered_workspaces,
                    last_error: err,
                };
            }
        }
        SidecarStatusDto {
            running: false,
            pid: None,
            port: None,
            base_url: None,
            mcp_url: None,
            executable_path: None,
            recovered_tasks: 0,
            recovered_workspaces: 0,
            last_error: err,
        }
    }

    pub fn bootstrap(&self) -> Result<SidecarBootstrapDto, String> {
        if self.status().running == false {
            self.start()?;
        }
        let guard = self
            .inner
            .lock()
            .map_err(|_| "Falha ao travar supervisor sidecar.".to_string())?;
        let proc_handle = guard
            .as_ref()
            .ok_or_else(|| "Sidecar não está ativo.".to_string())?;
        Ok(SidecarBootstrapDto {
            running: true,
            base_url: proc_handle.base_url.clone(),
            mcp_url: proc_handle.mcp_url.clone(),
            ui_token: proc_handle.ui_token.clone(),
            pid: proc_handle.pid,
            port: proc_handle.port,
        })
    }
}

impl Drop for SidecarSupervisor {
    fn drop(&mut self) {
        self.stop();
    }
}

#[tauri::command]
fn core_sidecar_status(state: State<SidecarSupervisor>) -> SidecarStatusDto {
    state.status()
}

#[tauri::command]
fn core_sidecar_bootstrap(state: State<SidecarSupervisor>) -> Result<SidecarBootstrapDto, String> {
    state.bootstrap()
}

#[tauri::command]
fn core_sidecar_restart(state: State<SidecarSupervisor>) -> Result<SidecarStatusDto, String> {
    state.start()
}

#[tauri::command]
fn core_sidecar_stop(state: State<SidecarSupervisor>) -> SidecarStatusDto {
    state.stop();
    state.status()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(SidecarSupervisor::default())
        .setup(|app| {
            let supervisor = app.state::<SidecarSupervisor>();
            let _ = supervisor.start();
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::Destroyed = event {
                let supervisor = window.app_handle().state::<SidecarSupervisor>();
                supervisor.stop();
            }
        })
        .invoke_handler(tauri::generate_handler![
            core_sidecar_status,
            core_sidecar_bootstrap,
            core_sidecar_restart,
            core_sidecar_stop
        ])
        .run(tauri::generate_context!())
        .expect("Falha ao iniciar Cloud Workspace IA");
}
