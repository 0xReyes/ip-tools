FROM debian:bookworm-slim

# Install essential network diagnostic tools
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        dnsutils \
        iputils-ping \
        whois \
        ca-certificates \
        netcat-openbsd \
        curl \
        telnet \
        nmap \
        traceroute && \
    # Clean up package manager artifacts
    rm -rf \
        /var/lib/apt/lists/* \
        /var/cache/apt/* \
        /usr/share/doc/* \
        /usr/share/man/*

# Create working directory
WORKDIR /app
