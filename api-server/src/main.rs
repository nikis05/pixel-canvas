use axum::{Json, Router, extract, http::StatusCode, response::IntoResponse, routing};
use either::Either;
use serde::Deserialize;
use tonlib_core::TonAddress;
use viewer::{Viewer, ViewerError};

#[derive(Deserialize)]
struct Env {
    port: u16,
    app_version: Option<String>,
    sentry_dsn: Option<String>,
    viewer_api_url: String,
    viewer_api_key: Option<String>,
    collection_address: String,
    store_address: String,
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

    let viewer = Viewer::new(env.viewer_api_url, env.viewer_api_key);

    let (collection_address, _, _) =
        TonAddress::from_base64_url_flags(&env.collection_address).unwrap();

    let (store_address, _, _) = TonAddress::from_base64_url_flags(&env.store_address).unwrap();

    #[derive(Deserialize)]
    struct NftsParams {
        owner_address: String,
        page: u32,
    }

    let app = Router::new()
        .route(
            "/api/nfts",
            routing::get({
                let viewer = viewer.clone();
                let collection_address = collection_address.clone();
                async move |extract::Query::<NftsParams>(params)| {
                    let Ok((owner_address, _, _)) =
                        TonAddress::from_base64_url_flags(&params.owner_address)
                    else {
                        return (StatusCode::BAD_REQUEST, "Invalid address").into_response();
                    };

                    let result = viewer
                        .get_items(collection_address, owner_address, Some(params.page))
                        .await;

                    match result {
                        Ok(items) => Json(items).into_response(),
                        Err(Either::Left(ViewerError::OverCapacity)) => {
                            eprintln!("Too many requests");
                            (StatusCode::TOO_MANY_REQUESTS, "Too Many Requests").into_response()
                        }
                        Err(Either::Right(err)) => {
                            capture_error(&err);
                            (StatusCode::INTERNAL_SERVER_ERROR, "Internal Error").into_response()
                        }
                    }
                }
            }),
        )
        .route(
            "/api/exclusives",
            routing::get(async move || {
                let result = viewer
                    .get_exclusives(collection_address, store_address)
                    .await;

                match result {
                    Ok(items) => Json(items).into_response(),
                    Err(Either::Left(ViewerError::OverCapacity)) => {
                        eprintln!("Too many requests");
                        (StatusCode::TOO_MANY_REQUESTS, "Too Many Requests").into_response()
                    }
                    Err(Either::Right(err)) => {
                        capture_error(&err);
                        (StatusCode::INTERNAL_SERVER_ERROR, "Internal Error").into_response()
                    }
                }
            }),
        )
        .route("/health", routing::get(async || "ok"));

    let listener = tokio::net::TcpListener::bind(("0.0.0.0", env.port))
        .await
        .unwrap();

    println!("API server is started, listening to requests...");

    axum::serve(listener, app).await.unwrap();

    drop(sentry);
}
