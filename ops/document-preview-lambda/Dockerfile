FROM python:3.12-slim-bookworm
WORKDIR /var/task
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-writer libreoffice-impress fonts-liberation2=2.1.5-1 fonts-noto-cjk=1:20220127+repack1-1 fonts-nanum=20200506-1 \
    ca-certificates curl poppler-utils util-linux && rm -rf /var/lib/apt/lists/*
ARG AHWP_ARCHIVE_SHA=959121202f90ca4a722b3ff21cdf2f5b54d6a9b378433083dde724740e353e0f
RUN test "$(dpkg --print-architecture)" = amd64 && mkdir -p /opt/ahwp && \
    curl -fsSL --retry 3 https://github.com/STAIxBWLB/agent-hwp/releases/download/v2.1.1/ahwp-v2.1.1-x86_64-unknown-linux-gnu.tar.gz -o /tmp/ahwp.tar.gz && \
    echo "$AHWP_ARCHIVE_SHA  /tmp/ahwp.tar.gz" | sha256sum -c - && \
    tar xzf /tmp/ahwp.tar.gz -C /opt/ahwp && rm /tmp/ahwp.tar.gz && \
    /opt/ahwp/ahwp --version && fc-cache -f
RUN pip install --no-cache-dir awslambdaric==3.1.1 boto3==1.39.10 olefile==0.47
COPY worker.py renderer.py ./
ENTRYPOINT ["python", "-m", "awslambdaric"]
CMD ["worker.handler"]
