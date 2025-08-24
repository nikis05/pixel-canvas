FROM rust:bullseye AS chef
RUN cargo install cargo-chef
WORKDIR /app

FROM chef AS planner
COPY ./render-server/Cargo.toml .
COPY ./render-server/Cargo.lock .
COPY ./render-server/src ./src/
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json
COPY ./render-server/Cargo.toml .
COPY ./render-server/Cargo.lock .
COPY ./render-server/src ./src/
RUN cargo build --release --bin render-server

FROM debian:bullseye-slim AS runtime
RUN apt update
RUN apk add --no-cache curl
RUN apk add --no-cache --repository http://dl-cdn.alpinelinux.org/alpine/v3.14/main ca-certificates
COPY --from=builder /app/target/release/render-server /usr/local/bin
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD exec curl --fail http://localhost:$PORT/health
ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION
CMD ["/usr/local/bin/render-server"]
