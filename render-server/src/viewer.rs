use std::{sync::Arc, time::Duration};

use abort_on_drop::ChildTask;
use either::Either;
use futures::TryFutureExt;
use futures_retry::{FutureRetry, RetryPolicy};
use serde::Deserialize;
use tokio::sync::{mpsc, oneshot};
use tonlib_core::TonAddress;

#[derive(Clone)]
pub struct Viewer {
    queue: mpsc::Sender<Job>,
    _worker: Arc<ChildTask<()>>,
}

struct Job {
    item_address: TonAddress,
    callback: oneshot::Sender<ViewerResult>,
}

pub type ViewerResult = Result<String, Either<ViewerError, anyhow::Error>>;

impl Viewer {
    pub fn new(api_url: String, api_key: Option<String>) -> Self {
        #[derive(Deserialize)]
        struct Payload {
            code: Option<u32>,
            exit_code: Option<i32>,
            stack: Option<Vec<StackElem>>,
        }

        #[derive(Deserialize)]
        struct StackElem {
            #[serde(rename = "type")]
            type_: String,
            value: String,
        }

        let (queue, mut rx) = mpsc::channel::<Job>(10);

        let worker = Arc::new(ChildTask::from(tokio::spawn(async move {
            while let Some(job) = rx.recv().await {
                let item_address = job.item_address.to_string();

                let result = {
                    let mut num_retries = 0;

                    FutureRetry::new(
                        || {
                            let (api_url, api_key, item_address) =
                                (api_url.clone(), api_key.clone(), item_address.clone());
                            async move {
                                let item_address = item_address.to_string();

                                let mut builder =
                                    reqwest::Client::new().post(format!("{api_url}/runGetMethod"));

                                if let Some(api_key) = &api_key {
                                    builder = builder.header("X-API-Key", api_key);
                                }

                                let response = builder
                                    .json(&serde_json::json!({
                                        "address": item_address,
                                        "method": "dna",
                                        "stack": []
                                    }))
                                    .send()
                                    .and_then(reqwest::Response::text)
                                    .map_err(|err| {
                                        Either::Right(
                                            anyhow::Error::new(err)
                                                .context("failed viewer request"),
                                        )
                                    })
                                    .await?;

                                let payload =
                                    serde_json::from_str::<Payload>(&response).map_err(|err| {
                                        Either::Right(anyhow::Error::new(err).context(format!(
                                            "failed to parse viewer response payload: {response}"
                                        )))
                                    })?;

                                if let Some(429) = payload.code {
                                    return Err(Either::Left(ViewerError::OverCapacity));
                                }

                                let err_response = || {
                                    Err(Either::Right(anyhow::anyhow!(
                                        "Error response from viewer: {}",
                                        response
                                    )))
                                };

                                let Some(0) = payload.exit_code else {
                                    return err_response();
                                };

                                if let Some(stack_item) =
                                    payload.stack.and_then(|mut stack| stack.pop())
                                {
                                    if stack_item.type_ == "cell" {
                                        Ok(stack_item.value)
                                    } else {
                                        err_response()
                                    }
                                } else {
                                    err_response()
                                }
                            }
                        },
                        |err| {
                            if matches!(err, Either::Left(ViewerError::OverCapacity))
                                && num_retries <= 3
                            {
                                num_retries += 1;
                                RetryPolicy::WaitRetry(Duration::from_secs(1))
                            } else {
                                RetryPolicy::ForwardError(err)
                            }
                        },
                    )
                    .await
                };
                job.callback
                    .send(result.map(|t| t.0).map_err(|err| err.0))
                    .unwrap();
            }
        })));

        Self {
            queue,
            _worker: worker,
        }
    }

    pub async fn get_dna(&self, item_address: TonAddress) -> ViewerResult {
        let (callback_tx, callback_rx) = oneshot::channel();
        let Ok(()) = self
            .queue
            .send(Job {
                item_address,
                callback: callback_tx,
            })
            .await
        else {
            return Err(Either::Left(ViewerError::OverCapacity));
        };

        callback_rx.await.unwrap()
    }
}

#[derive(Debug)]
pub enum ViewerError {
    OverCapacity,
}
