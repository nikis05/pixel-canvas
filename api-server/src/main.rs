use axum::{
    Json, Router, extract,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing,
};
use either::Either;
use serde::{Deserialize, Serialize};
use tonlib_core::TonAddress;
use tower_http::cors::CorsLayer;
use viewer::{Viewer, ViewerError, ViewerResult};

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
        page: usize,
    }

    let cors = CorsLayer::permissive();

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

                    handle_viewer_result(result)
                }
            }),
        )
        .route(
            "/api/exclusives",
            routing::get({
                let viewer = viewer.clone();
                let store_address = store_address.clone();
                async move || {
                    let result = viewer
                        .get_exclusives(collection_address, store_address)
                        .await;

                    handle_viewer_result(result)
                }
            }),
        )
        .route(
            "/api/item_price",
            routing::get(async move || {
                let result = viewer.get_item_price(store_address).await;

                handle_viewer_result(result)
            }),
        )
        .route("/health", routing::get(async || "ok"))
        .layer(cors);

    let listener = tokio::net::TcpListener::bind(("0.0.0.0", env.port))
        .await
        .unwrap();

    println!("API server is started, listening to requests...");

    axum::serve(listener, app).await.unwrap();

    drop(sentry);
}

fn handle_viewer_result<T: Serialize>(result: ViewerResult<T>) -> Response {
    match result {
        Ok(data) => Json(data).into_response(),
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
