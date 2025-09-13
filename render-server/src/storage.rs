use crate::dna::Dna;
use base64::Engine;
use bytes::Bytes;
use futures::{Stream, TryStreamExt};
use s3::Bucket;
use sha2::{Digest, Sha256};
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
        path: &Path,
    ) -> anyhow::Result<Option<impl Stream<Item = anyhow::Result<Bytes>> + 'static>> {
        let result = self.0.get_object_stream(&path.0).await;

        if let Err(s3::error::S3Error::HttpFailWithBody(404, _)) = result {
            return Ok(None);
        }

        Ok(Some(result?.bytes.map_err(anyhow::Error::new)))
    }

    pub async fn put(&self, path: &Path, payload: Bytes) -> anyhow::Result<()> {
        self.0.put_object(&path.0, &payload).await?;
        Ok(())
    }
}

pub struct Path(String);

impl Path {
    pub fn for_image(dna: &Dna) -> Self {
        let digest = Sha256::digest(dna.bytes());
        let base64 = base64::engine::general_purpose::STANDARD.encode(digest);
        Self(format!("image/{base64}"))
    }
}
