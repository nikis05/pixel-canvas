FROM rust:bullseye AS chef
RUN cargo install cargo-chef
WORKDIR /app

FROM chef AS planner
COPY ./Cargo.toml .
COPY ./Cargo.lock .
COPY ./rust-colors ./rust-colors
COPY ./wasm ./wasm
COPY ./viewer ./viewer
COPY ./api-server ./api-server
COPY ./render-server ./render-server
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY ./palette.json .
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json
COPY ./Cargo.toml .
COPY ./Cargo.lock .
COPY ./rust-colors ./rust-colors
COPY ./wasm ./wasm
COPY ./viewer ./viewer
COPY ./api-server ./api-server
COPY ./render-server ./render-server
ARG PACKAGE
RUN cargo build --frozen --release --bin ${PACKAGE}

FROM debian:bullseye-slim AS runtime
RUN apt update
RUN apt install -y curl
ARG PACKAGE
COPY --from=builder /app/target/release/${PACKAGE} /usr/local/bin
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD exec curl --fail http://localhost:$PORT/health
ENV RUST_BACKTRACE=1
ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION
ENV DOCKER__TARGET=$PACKAGE
CMD ["sh", "-c", "/usr/local/bin/$DOCKER__TARGET"]
