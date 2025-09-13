use bytes::Bytes;
use futures::{Stream, TryStreamExt};
use s3::Bucket;
use std::sync::Arc;

#[derive(Clone)]
pub struct Storage(Arc<Bucket>);

impl Storage {
    pub fn new(
        s3_endpoint: String,
        s3_region: String,
        s3_access_key: &str,
        s3_secret_key: &str,
        s3_bucket_name: &str,
    ) -> Self {
        Self(Arc::new(
            *Bucket::new(
                s3_bucket_name,
                s3::Region::Custom {
                    endpoint: s3_endpoint,
                    region: s3_region,
                },
                s3::creds::Credentials::new(
                    Some(s3_access_key),
                    Some(s3_secret_key),
                    None,
                    None,
                    None,
                )
                .unwrap(),
            )
            .unwrap(),
        ))
    }

    pub async fn get(
        &self,
        path: &str,
    ) -> anyhow::Result<Option<impl Stream<Item = anyhow::Result<Bytes>> + 'static>> {
        let result = self.0.get_object_stream(path).await;

        if let Err(s3::error::S3Error::HttpFailWithBody(404, _)) = result {
            return Ok(None);
        }

        Ok(Some(result?.bytes.map_err(anyhow::Error::new)))
    }

    pub async fn put(&self, path: &str, payload: Bytes) -> anyhow::Result<()> {
        self.0.put_object(path, &payload).await?;
        Ok(())
    }
}
