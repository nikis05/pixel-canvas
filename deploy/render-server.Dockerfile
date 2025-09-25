FROM rust:bullseye AS chef
RUN cargo install cargo-chef
WORKDIR /app

FROM chef AS planner
COPY ./Cargo.toml .
COPY ./Cargo.lock .
COPY ./rust-colors ./rust-colors
COPY ./image-codec ./image-codec
COPY ./render-server ./render-server
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY ./palette.json .
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json
COPY ./Cargo.toml .
COPY ./Cargo.lock .
COPY ./rust-colors ./rust-colors
COPY ./image-codec ./image-codec
COPY ./render-server ./render-server
RUN cargo build --frozen --release --bin render-server

FROM debian:bullseye-slim AS runtime
RUN apt update
RUN apt install -y curl
COPY --from=builder /app/target/release/render-server /usr/local/bin
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD exec curl --fail http://localhost:$PORT/health
ENV RUST_BACKTRACE=1
ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION
CMD ["/usr/local/bin/render-server"]
