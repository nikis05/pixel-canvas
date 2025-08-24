#![warn(clippy::pedantic, clippy::todo)]
#![forbid(unused_must_use)]
use crate::{
    dna::Dna,
    storage::{Path, Storage},
};
use axum::{
    Router,
    body::Body,
    http::{StatusCode, header},
    response::IntoResponse,
    routing::{self},
};
use futures::TryStreamExt;
use serde::Deserialize;
use std::str::FromStr;

mod dna;
mod render;
mod storage;

#[derive(Deserialize)]
struct Env {
    port: u16,
    app_version: Option<String>,
    sentry_dsn: Option<String>,
    s3_endpoint: Option<String>,
    s3_region: Option<String>,
    s3_access_key: Option<String>,
}

fn capture_error(err: &anyhow::Error) {
    sentry::integrations::anyhow::capture_anyhow(err);
    eprintln!("{err}");
}

#[tokio::main]
async fn main() {
    let env = envy::from_env::<Env>().unwrap();

    let mut sentry = None;

    if let Some(sentry_dsn) = env.sentry_dsn {
        sentry = Some(sentry::init((
            sentry_dsn,
            sentry::ClientOptions {
                send_default_pii: true,
                release: env.app_version.map(Into::into),
                ..Default::default()
            },
        )));
    }

    let mut storage = None;

    if let Some(s3_endpoint) = env.s3_endpoint {
        storage = Some(Storage::new(
            s3_endpoint,
            env.s3_region.unwrap(),
            &env.s3_access_key.unwrap(),
        ));
    }

    let app = Router::new()
        .route(
            "/img",
            routing::get({
                async move |raw_dna: String| {
                    let dna = match Dna::from_str(&raw_dna) {
                        Ok(parsed_dna) => parsed_dna,
                        Err(err) => {
                            capture_error(&err);
                            return (StatusCode::BAD_REQUEST, "Invalid DNA").into_response();
                        }
                    };

                    let path = Path::for_dna(&dna);

                    let existing_file = if let Some(storage) = &storage {
                        match storage.get(&path).await {
                            Ok(existing_file) => existing_file,
                            Err(err) => {
                                capture_error(&err);
                                return (
                                    StatusCode::SERVICE_UNAVAILABLE,
                                    "Service Temporarily Unavailable",
                                )
                                    .into_response();
                            }
                        }
                    } else {
                        None
                    };

                    if let Some(stream) = existing_file {
                        return (
                            [(header::CONTENT_TYPE, "image/png")],
                            Body::from_stream(stream.map_err(|err| {
                                capture_error(&err);
                                anyhow::Error::msg("Internal Error")
                            })),
                        )
                            .into_response();
                    }

                    let file = Box::pin(render::render(dna)).await;

                    if let Some(storage) = storage {
                        tokio::spawn({
                            let file = file.clone();
                            let storage = storage.clone();
                            async move {
                                if let Err(err) = storage.put(&path, file).await {
                                    capture_error(&err);
                                }
                            }
                        });
                    }

                    ([(header::CONTENT_TYPE, "image/png")], file).into_response()
                }
            }),
        )
        .route("/health", routing::get(async || "ok"));

    let listener = tokio::net::TcpListener::bind(("0.0.0.0", env.port))
        .await
        .unwrap();

    println!("Render server is started, listening to requests...");

    axum::serve(listener, app).await.unwrap();

    drop(sentry);
}
