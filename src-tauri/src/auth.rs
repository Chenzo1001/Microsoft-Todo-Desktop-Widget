use anyhow::{anyhow, Context};
use base64::Engine;
use reqwest::Client;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use url::Url;
use uuid::Uuid;

use crate::{db, models::TokenResponse, AppState};

const SERVICE: &str = "ms-todo-desktop-widget";
const REFRESH_USER: &str = "microsoft-refresh-token";
const SCOPES: &str = "User.Read Tasks.ReadWrite offline_access";

pub struct BrowserLoginSession {
    pub auth_url: String,
    pub listeners: Vec<TcpListener>,
    pub redirect_uri: String,
    pub code_verifier: String,
    pub state: String,
}

pub async fn prepare_browser_login(state: &AppState) -> anyhow::Result<BrowserLoginSession> {
    let client_id = state
        .client_id
        .as_deref()
        .ok_or_else(|| anyhow!("MICROSOFT_CLIENT_ID is not configured"))?;
    let listener_v4 = TcpListener::bind("127.0.0.1:0")
        .await
        .context("failed to bind local auth callback")?;
    let port = listener_v4.local_addr()?.port();
    let mut listeners = vec![listener_v4];

    if let Ok(listener_v6) = TcpListener::bind(format!("[::1]:{port}")).await {
        listeners.push(listener_v6);
    }

    let redirect_uri = format!("http://localhost:{port}");
    let code_verifier = pkce_verifier();
    let code_challenge = pkce_challenge(&code_verifier);
    let state_nonce = Uuid::new_v4().to_string();

    let mut auth_url = Url::parse(&format!(
        "https://login.microsoftonline.com/{}/oauth2/v2.0/authorize",
        state.tenant
    ))?;
    auth_url
        .query_pairs_mut()
        .append_pair("client_id", client_id)
        .append_pair("response_type", "code")
        .append_pair("redirect_uri", &redirect_uri)
        .append_pair("response_mode", "query")
        .append_pair("scope", SCOPES)
        .append_pair("state", &state_nonce)
        .append_pair("code_challenge", &code_challenge)
        .append_pair("code_challenge_method", "S256")
        .append_pair("prompt", "select_account");

    Ok(BrowserLoginSession {
        auth_url: auth_url.to_string(),
        listeners,
        redirect_uri,
        code_verifier,
        state: state_nonce,
    })
}

pub async fn complete_browser_login(
    http: Client,
    tenant: String,
    client_id: String,
    session: BrowserLoginSession,
) -> anyhow::Result<String> {
    let mut stream = tokio::time::timeout(
        std::time::Duration::from_secs(300),
        accept_callback(session.listeners),
    )
    .await
    .context("Microsoft login timed out")??;

    let mut buffer = vec![0_u8; 8192];
    let size = stream.read(&mut buffer).await?;
    let request = String::from_utf8_lossy(&buffer[..size]);
    let callback_url = parse_callback_url(&request, &session.redirect_uri)?;

    let query: std::collections::HashMap<_, _> = callback_url.query_pairs().into_owned().collect();
    if query.get("state") != Some(&session.state) {
        respond(
            &mut stream,
            false,
            "Invalid sign-in state. You can close this tab.",
        )
        .await?;
        return Err(anyhow!("invalid auth state"));
    }

    if let Some(error) = query.get("error") {
        let description = query
            .get("error_description")
            .cloned()
            .unwrap_or_else(|| error.to_string());
        respond(&mut stream, false, &description).await?;
        return Err(anyhow!(description));
    }

    let code = query
        .get("code")
        .ok_or_else(|| anyhow!("Microsoft callback did not include an authorization code"))?;

    let token_url = format!("https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token");
    let token = http
        .post(token_url)
        .form(&[
            ("client_id", client_id.as_str()),
            ("scope", SCOPES),
            ("code", code.as_str()),
            ("redirect_uri", session.redirect_uri.as_str()),
            ("grant_type", "authorization_code"),
            ("code_verifier", session.code_verifier.as_str()),
        ])
        .send()
        .await?
        .error_for_status()?
        .json::<TokenResponse>()
        .await?;

    if let Some(error) = token.error {
        let description = token.error_description.unwrap_or(error);
        respond(&mut stream, false, &description).await?;
        return Err(anyhow!(description));
    }

    let refresh_token = token
        .refresh_token
        .ok_or_else(|| anyhow!("token response did not include refresh_token"))?;
    let _ = store_refresh_token(&refresh_token);
    respond(
        &mut stream,
        true,
        "Microsoft To Do login complete. You can close this tab.",
    )
    .await?;

    Ok(refresh_token)
}

async fn accept_callback(listeners: Vec<TcpListener>) -> anyhow::Result<TcpStream> {
    match listeners.as_slice() {
        [listener] => {
            let (stream, _) = listener.accept().await?;
            Ok(stream)
        }
        [listener_v4, listener_v6, ..] => {
            tokio::select! {
                result = listener_v4.accept() => Ok(result?.0),
                result = listener_v6.accept() => Ok(result?.0),
            }
        }
        [] => Err(anyhow!("no auth callback listener is available")),
    }
}

pub async fn access_token(state: &AppState) -> anyhow::Result<String> {
    let client_id = state
        .client_id
        .as_deref()
        .ok_or_else(|| anyhow!("MICROSOFT_CLIENT_ID is not configured"))?;
    let refresh_token = load_refresh_token(state)?;
    let url = format!(
        "https://login.microsoftonline.com/{}/oauth2/v2.0/token",
        state.tenant
    );

    let token = state
        .http
        .post(url)
        .form(&[
            ("grant_type", "refresh_token"),
            ("client_id", client_id),
            ("refresh_token", refresh_token.as_str()),
            ("scope", SCOPES),
        ])
        .send()
        .await?
        .error_for_status()?
        .json::<TokenResponse>()
        .await?;

    if let Some(refresh_token) = token.refresh_token {
        let _ = store_refresh_token(&refresh_token);
        if let Ok(conn) = state.db.lock() {
            let _ = db::save_auth_refresh_token(&conn, &refresh_token);
        }
    }

    token
        .access_token
        .ok_or_else(|| anyhow!("missing access token"))
}

pub fn has_refresh_token(state: &AppState) -> bool {
    load_refresh_token(state).is_ok()
}

pub fn load_refresh_token(state: &AppState) -> anyhow::Result<String> {
    if let Ok(token) = keyring::Entry::new(SERVICE, REFRESH_USER)
        .context("failed to open keyring")
        .and_then(|entry| {
            entry
                .get_password()
                .context("refresh token is not available")
        })
    {
        if !token.trim().is_empty() {
            return Ok(token);
        }
    }

    let conn = state
        .db
        .lock()
        .map_err(|_| anyhow!("database lock poisoned"))?;
    db::load_auth_refresh_token(&conn)?
        .filter(|token| !token.trim().is_empty())
        .ok_or_else(|| anyhow!("refresh token is not available"))
}

pub fn store_refresh_token(refresh_token: &str) -> anyhow::Result<()> {
    keyring::Entry::new(SERVICE, REFRESH_USER)
        .context("failed to open keyring")?
        .set_password(refresh_token)
        .context("failed to save refresh token")
}

pub fn clear_refresh_token(state: &AppState) -> anyhow::Result<()> {
    if let Ok(entry) = keyring::Entry::new(SERVICE, REFRESH_USER) {
        let _ = entry.delete_credential();
    }
    let conn = state
        .db
        .lock()
        .map_err(|_| anyhow!("database lock poisoned"))?;
    db::clear_auth_refresh_token(&conn)?;
    Ok(())
}

fn pkce_verifier() -> String {
    format!(
        "{}{}{}",
        Uuid::new_v4().simple(),
        Uuid::new_v4().simple(),
        Uuid::new_v4().simple()
    )
}

fn pkce_challenge(verifier: &str) -> String {
    use sha2::{Digest, Sha256};

    let digest = Sha256::digest(verifier.as_bytes());
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(digest)
}

fn parse_callback_url(request: &str, redirect_uri: &str) -> anyhow::Result<Url> {
    let first_line = request
        .lines()
        .next()
        .ok_or_else(|| anyhow!("empty auth callback request"))?;
    let path = first_line
        .split_whitespace()
        .nth(1)
        .ok_or_else(|| anyhow!("invalid auth callback request"))?;
    let base = Url::parse(redirect_uri)?;
    base.join(path).context("failed to parse auth callback url")
}

async fn respond(
    stream: &mut tokio::net::TcpStream,
    ok: bool,
    message: &str,
) -> anyhow::Result<()> {
    let title = if ok { "Login complete" } else { "Login failed" };
    let escaped = message
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;");
    let body = format!(
        "<!doctype html><meta charset=\"utf-8\"><title>{title}</title><body style=\"font-family:Segoe UI,Arial,sans-serif;padding:32px\"><h1>{title}</h1><p>{escaped}</p></body>"
    );
    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        body.as_bytes().len(),
        body
    );
    stream.write_all(response.as_bytes()).await?;
    Ok(())
}
