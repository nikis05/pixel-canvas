use abort_on_drop::ChildTask;
use either::Either;
use futures::TryFutureExt;
use futures_retry::{FutureRetry, RetryPolicy};
use itertools::Itertools;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, sync::Arc, time::Duration};
use tokio::sync::{mpsc, oneshot};
use tonlib_core::{
    TonAddress,
    cell::{ArcCell, TonCellError},
    tlb_types::tlb::TLB,
};

#[derive(Clone)]
pub struct Viewer {
    queue: mpsc::Sender<Job>,
    _worker: Arc<ChildTask<()>>,
}

struct Job {
    method: (reqwest::Method, &'static str),
    params: serde_json::Value,
    callback: oneshot::Sender<ViewerResult<(serde_json::Value, String)>>,
}

pub type ViewerResult<T> = Result<T, Either<ViewerError, anyhow::Error>>;

#[derive(Serialize)]
pub struct NftItemsResponse {
    items: Vec<NftItem>,
    has_next_page: bool,
}

#[derive(Serialize)]
pub struct NftItem {
    pub index: u32,
    pub name: String,
    pub description: String,
}

impl Viewer {
    pub fn new(api_url: String, api_key: Option<String>) -> Self {
        #[derive(Deserialize)]
        struct Payload {
            code: Option<u32>,
        }

        let (queue, mut rx) = mpsc::channel::<Job>(10);

        let worker = Arc::new(ChildTask::from(tokio::spawn(async move {
            while let Some(job) = rx.recv().await {
                let method = job.method.to_owned();
                let params = job.params;

                let result = {
                    let mut num_retries = 0;

                    FutureRetry::new(
                        || {
                            let (api_url, api_key, (http_method, api_method), params) = (
                                api_url.clone(),
                                api_key.clone(),
                                method.clone(),
                                params.clone(),
                            );
                            async move {
                                let mut builder = reqwest::Client::new()
                                    .request(http_method.clone(), format!("{api_url}/{api_method}"));

                                if let Some(api_key) = &api_key {
                                    builder = builder.header("X-API-Key", api_key);
                                }

                                if http_method == reqwest::Method::GET {
                                    builder = builder.query(&params);
                                } else {
                                    builder = builder.json(&params);
                                }

                                let response = builder
                                    .send()
                                    .and_then(reqwest::Response::text)
                                    .map_err(|err| {
                                        Either::Right(
                                            anyhow::Error::new(err)
                                                .context("failed viewer request"),
                                        )
                                    })
                                    .await?;

                                let json = serde_json::from_str::<serde_json::Value>(&response)
                                    .map_err(|err| {
                                        Either::Right(anyhow::Error::new(err).context(format!(
                                            "failed to parse viewer response payload (invalid JSON): {response}"
                                        )))
                                    })?;

                                let payload = serde_json::from_value::<Payload>(json.clone())
                                    .map_err(|err| {
                                        Either::Right(anyhow::Error::new(err).context(format!(
                                            "failed to parse viewer response payload (invalid format): {response}"
                                        )))
                                    })?;

                                if let Some(429) = payload.code {
                                    return Err(Either::Left(ViewerError::OverCapacity));
                                }

                                Ok((json, response))
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
                    .ok();
            }
        })));

        Self {
            queue,
            _worker: worker,
        }
    }

    pub async fn get_dna(&self, item_address: TonAddress) -> ViewerResult<String> {
        struct GetDna {
            item_address: TonAddress,
        }

        impl Task for GetDna {
            type Output = String;

            fn job_payload(&self) -> ((reqwest::Method, &'static str), serde_json::Value) {
                let item_address = self.item_address.to_string();
                let params = serde_json::json!({
                    "address": item_address,
                    "method": "dna",
                    "stack": []
                });
                ((reqwest::Method::POST, "runGetMethod"), params)
            }

            fn parse_output(output: serde_json::Value) -> Result<Self::Output, anyhow::Error> {
                #[derive(Deserialize)]
                struct Payload {
                    stack: Option<Vec<StackElem>>,
                }

                #[derive(Deserialize)]
                struct StackElem {
                    #[serde(rename = "type")]
                    type_: String,
                    value: String,
                }

                let err_response = || anyhow::anyhow!("Invalid response from viewer");

                let payload = serde_json::from_value::<Payload>(output)?;
                if let Some(stack_item) = payload.stack.and_then(|mut stack| stack.pop()) {
                    if stack_item.type_ == "cell" {
                        Ok(stack_item.value)
                    } else {
                        Err(err_response())
                    }
                } else {
                    Err(err_response())
                }
            }
        }

        self.run_task(GetDna { item_address }).await
    }

    pub async fn get_items(
        &self,
        collection_address: TonAddress,
        owner_address: TonAddress,
        page: Option<usize>,
    ) -> ViewerResult<NftItemsResponse> {
        struct GetItems {
            collection_address: TonAddress,
            owner_address: TonAddress,
            page: Option<usize>,
        }

        const PAGE_SIZE: usize = 4;

        impl Task for GetItems {
            type Output = NftItemsResponse;

            fn job_payload(&self) -> ((reqwest::Method, &'static str), serde_json::Value) {
                let mut params = serde_json::value::Map::with_capacity(4);
                params.insert(
                    "collection_address".into(),
                    self.collection_address.to_string().into(),
                );
                params.insert(
                    "owner_address".into(),
                    self.owner_address.to_string().into(),
                );

                if let Some(page) = self.page {
                    params.insert("limit".into(), (PAGE_SIZE + 1).into());
                    params.insert("offset".into(), (page * PAGE_SIZE).into());
                }

                (
                    (reqwest::Method::GET, "nft/items"),
                    serde_json::Value::Object(params),
                )
            }

            fn parse_output(output: serde_json::Value) -> Result<Self::Output, anyhow::Error> {
                #[derive(Deserialize)]
                struct Payload {
                    nft_items: Vec<NftItemSpec>,
                }

                #[derive(Deserialize)]
                struct NftItemSpec {
                    index: String,
                    content: NftContent,
                }

                #[derive(Deserialize)]
                struct NftContent {
                    name: String,
                    description: String,
                }

                let payload = serde_json::from_value::<Payload>(output)?;

                let has_next_page = payload.nft_items.len() > PAGE_SIZE;
                let items = payload
                    .nft_items
                    .into_iter()
                    .take(PAGE_SIZE)
                    .map(|item| {
                        Ok::<_, anyhow::Error>(NftItem {
                            index: item.index.parse::<u32>().map_err(|_| {
                                anyhow::Error::msg(format!("invalid item index: {}", item.index))
                            })?,
                            name: item.content.name,
                            description: item.content.description,
                        })
                    })
                    .collect::<Result<Vec<_>, _>>()?;

                Ok(NftItemsResponse {
                    items,
                    has_next_page,
                })
            }
        }

        self.run_task(GetItems {
            collection_address,
            owner_address,
            page,
        })
        .await
    }

    pub async fn get_exclusives(
        &self,
        collection_address: TonAddress,
        store_address: TonAddress,
    ) -> ViewerResult<Vec<(NftItem, u32)>> {
        struct GetExclusivesOffered {
            store_address: TonAddress,
        }

        impl Task for GetExclusivesOffered {
            type Output = HashMap<u32, u32>;

            fn job_payload(&self) -> ((reqwest::Method, &'static str), serde_json::Value) {
                let store_address = self.store_address.to_string();
                let params = serde_json::json!({
                    "address": store_address,
                    "method": "exclusives_offered",
                    "stack": []
                });
                ((reqwest::Method::POST, "runGetMethod"), params)
            }

            fn parse_output(output: serde_json::Value) -> Result<Self::Output, anyhow::Error> {
                #[derive(Deserialize)]
                struct Payload {
                    stack: Option<Vec<StackElem>>,
                }

                #[derive(Deserialize)]
                struct StackElem {
                    #[serde(rename = "type")]
                    type_: String,
                    value: serde_json::Value,
                }

                let err_response = || anyhow::anyhow!("invalid response from viewer");

                let payload = serde_json::from_value::<Payload>(output)?;

                let boc = if let Some(stack_item) = payload.stack.and_then(|mut stack| stack.pop())
                {
                    if stack_item.type_ == "cell" {
                        if let Some(boc) = stack_item.value.as_str() {
                            boc.to_owned()
                        } else {
                            return Ok(HashMap::new());
                        }
                    } else {
                        return Ok(HashMap::new());
                    }
                } else {
                    return Err(err_response());
                };

                let cell = ArcCell::from_boc_b64(&boc)
                    .map_err(|err| anyhow::Error::new(err).context("failed to parse cell"))?;

                let parsed = cell
                    .parse_fully(|parser| {
                        parser.load_dict_data(
                            32,
                            |int| {
                                u32::try_from(int)
                                    .map_err(|err| TonCellError::InvalidInput(err.to_string()))
                            },
                            |val| {
                                u32::try_from(val.load_int(257)?)
                                    .map_err(|err| TonCellError::InvalidInput(err.to_string()))
                            },
                        )
                    })
                    .map_err(|err| anyhow::Error::new(err).context("failed to parse cell"))?;

                Ok(parsed)
            }
        }

        let exclusives_offered = self
            .run_task(GetExclusivesOffered {
                store_address: store_address.clone(),
            })
            .await?;

        let mut items = self
            .get_items(collection_address, store_address, None)
            .await?
            .items
            .into_iter()
            .map(|item| (item.index, item))
            .collect::<HashMap<_, _>>();

        let exclusives_with_data = exclusives_offered
            .into_iter()
            .sorted_by_key(|(index, _)| *index)
            .filter_map(|(index, price)| items.remove(&index).map(|data| (data, price)))
            .collect();

        Ok(exclusives_with_data)
    }

    pub async fn get_item_price(&self, store_address: TonAddress) -> ViewerResult<u32> {
        struct GetItemPrice {
            store_address: TonAddress,
        }

        impl Task for GetItemPrice {
            type Output = u32;

            fn job_payload(&self) -> ((reqwest::Method, &'static str), serde_json::Value) {
                let store_address = self.store_address.to_string();
                let params = serde_json::json!({
                    "address": store_address,
                    "method": "item_price",
                    "stack": []
                });
                ((reqwest::Method::POST, "runGetMethod"), params)
            }

            fn parse_output(output: serde_json::Value) -> Result<Self::Output, anyhow::Error> {
                #[derive(Deserialize)]
                struct Payload {
                    stack: Option<Vec<StackElem>>,
                }

                #[derive(Deserialize)]
                struct StackElem {
                    #[serde(rename = "type")]
                    type_: String,
                    value: String,
                }

                let err_response = || anyhow::anyhow!("Invalid response from viewer");

                let payload = serde_json::from_value::<Payload>(output)?;

                if let Some(stack_item) = payload.stack.and_then(|mut stack| stack.pop()) {
                    if stack_item.type_ == "num" {
                        u32::from_str_radix(&stack_item.value[2..], 16).map_err(|_| err_response())
                    } else {
                        Err(err_response())
                    }
                } else {
                    Err(err_response())
                }
            }
        }

        self.run_task(GetItemPrice { store_address }).await
    }

    async fn run_task<T: Task>(&self, task: T) -> ViewerResult<T::Output> {
        let (callback_tx, callback_rx) = oneshot::channel();
        let (method, params) = task.job_payload();

        let Ok(()) = self
            .queue
            .send(Job {
                method,
                params,
                callback: callback_tx,
            })
            .await
        else {
            return Err(Either::Left(ViewerError::OverCapacity));
        };

        let (output, response) = callback_rx.await.unwrap()?;
        T::parse_output(output).map_err(|err| {
            Either::Right(err.context(format!(
                "failed to parse viewer response payload (conversion failed): {response}"
            )))
        })
    }
}

trait Task {
    type Output;

    fn job_payload(&self) -> ((reqwest::Method, &'static str), serde_json::Value);

    fn parse_output(output: serde_json::Value) -> Result<Self::Output, anyhow::Error>;
}

#[derive(Debug)]
pub enum ViewerError {
    OverCapacity,
}
