#![warn(clippy::pedantic, clippy::todo)]
#![forbid(unused_must_use)]
use crate::{dna::Dna, item_address::item_address, storage::Storage};
use axum::{
    Router,
    body::Body,
    extract,
    http::{StatusCode, header},
    response::IntoResponse,
    routing::{self},
};
use either::Either;
use futures::TryStreamExt;
use serde::Deserialize;
use viewer::{Viewer, ViewerError};

mod dna;
mod item_address;
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
    s3_secret_key: Option<String>,
    s3_bucket_name: Option<String>,
    viewer_api_url: String,
    viewer_api_key: Option<String>,
    collection_address: String,
}

fn capture_error(err: &anyhow::Error) {
    sentry::integrations::anyhow::capture_anyhow(err);
    eprintln!("{err}");
}

#[allow(clippy::too_many_lines)]
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
            &env.s3_secret_key.unwrap(),
            &env.s3_bucket_name.unwrap(),
        ));
    }

    let viewer = Viewer::new(env.viewer_api_url, env.viewer_api_key);

    let app = Router::new()
        .route(
            "/img/{item_index}",
            routing::get({
                async move |item_index: extract::Path<u32>| {
                    let item_index = item_index.0;
                    let item_address = item_address(&env.collection_address, item_index);
                    let raw_dna = match viewer.get_dna(item_address).await {
                        Ok(raw_dna) => raw_dna,
                        Err(Either::Left(ViewerError::OverCapacity)) => {
                            eprintln!("Too many requests");
                            return (StatusCode::TOO_MANY_REQUESTS, "Too Many Requests")
                                .into_response();
                        }
                        Err(Either::Right(err)) => {
                            capture_error(&err);
                            return (StatusCode::INTERNAL_SERVER_ERROR, "Internal Error")
                                .into_response();
                        }
                    };

                    let dna = match Dna::from_boc(&raw_dna) {
                        Ok(parsed_dna) => parsed_dna,
                        Err(err) => {
                            capture_error(&err);
                            return (StatusCode::INTERNAL_SERVER_ERROR, "Internal Error")
                                .into_response();
                        }
                    };

                    let path = format!("image/{item_index}");

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
