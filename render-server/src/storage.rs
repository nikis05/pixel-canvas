use bytes::Bytes;
use futures::{Stream, TryStreamExt};
use s3::Bucket;
use std::sync::Arc;

#[derive(Clone)]
pub struct Storage(Arc<Bucket>);

impl Storage {
    pub fn new(s3_endpoint: String, s3_region: String, s3_access_key: &str) -> Self {
        Self(Arc::new(
            *Bucket::new(
                "renders",
                s3::Region::Custom {
                    endpoint: s3_endpoint,
                    region: s3_region,
                },
                s3::creds::Credentials::new(Some(s3_access_key), None, None, None, None).unwrap(),
            )
            .unwrap(),
        ))
    }

    pub async fn get(
        &self,
        dna: &str,
    ) -> anyhow::Result<Option<impl Stream<Item = anyhow::Result<Bytes>> + 'static>> {
        Ok(Some(
            self.0
                .get_object_stream(dna)
                .await?
                .bytes
                .map_err(anyhow::Error::new),
        ))
    }

    pub async fn put(&self, dna: &str, payload: Bytes) -> anyhow::Result<()> {
        self.0.put_object(dna, &payload).await?;
        Ok(())
    }
}
