#![warn(clippy::pedantic)]

use crate::{render::Dna, storage::Storage};
use axum::{
    Router,
    body::Body,
    extract,
    http::{StatusCode, header},
    response::IntoResponse,
    routing::{self},
};
use futures::TryStreamExt;
use sentry::integrations::anyhow::capture_anyhow;
use serde::Deserialize;
use std::str::FromStr;

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
            "/img/{dna}",
            routing::get({
                async move |extract::Path(dna): extract::Path<String>| {
                    let existing_file = if let Some(storage) = &storage {
                        match storage.get(&dna).await {
                            Ok(existing_file) => existing_file,
                            Err(err) => {
                                sentry::integrations::anyhow::capture_anyhow(&err);
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
                                capture_anyhow(&err);
                                anyhow::Error::msg("Internal Error")
                            })),
                        )
                            .into_response();
                    }

                    let parsed_dna = match Dna::from_str(&dna) {
                        Ok(parsed_dna) => parsed_dna,
                        Err(err) => {
                            capture_anyhow(&err);
                            return (StatusCode::BAD_REQUEST, "Invalid DNA").into_response();
                        }
                    };

                    let file = Box::pin(render::render(parsed_dna)).await;

                    if let Some(storage) = storage {
                        tokio::spawn({
                            let file = file.clone();
                            let storage = storage.clone();
                            async move {
                                if let Err(err) = storage.post(&dna, file).await {
                                    capture_anyhow(&err);
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

    axum::serve(listener, app).await.unwrap();

    drop(sentry);
}
