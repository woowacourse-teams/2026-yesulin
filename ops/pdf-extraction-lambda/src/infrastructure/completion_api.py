"""Authenticated direct delivery. Failed delivery raises so Lambda can retry the cached result."""
import json
import urllib.error
import urllib.parse
import urllib.request

from application.completion import completion_body


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class CompletionApi:
    def __init__(self, store, url, token, *, allow_local_http=False):
        parsed = urllib.parse.urlsplit(url)
        local = (allow_local_http and parsed.scheme == "http"
                 and parsed.hostname in {"localhost", "127.0.0.1", "host.docker.internal"})
        if (not (parsed.scheme == "https" or local) or not parsed.hostname
                or parsed.username or parsed.password or parsed.query or parsed.fragment
                or parsed.path != "/internal/v1/pdf-extractions/completions"):
            raise ValueError("INVALID_COMPLETION_API_URL")
        if len(token) < 32 or any(character.isspace() for character in token):
            raise ValueError("INVALID_COMPLETION_API_TOKEN")
        self.store, self.url, self.token = store, url, token
        self.opener = urllib.request.build_opener(NoRedirect())
        self.processor = None
        self.remaining_ms = None

    def context(self, job_id):
        import uuid
        if str(uuid.UUID(job_id)) != job_id:
            raise ValueError("INVALID_JOB_ID")
        url = self.url.removesuffix("/completions") + "/" + job_id + "/review-context"
        request = urllib.request.Request(url, headers={"Authorization": "Bearer " + self.token})
        try:
            with self.opener.open(request, timeout=10) as response:
                body = response.read(32_769)
            if len(body) > 32_768:
                raise ValueError("REVIEW_CONTEXT_TOO_LARGE")
            return json.loads(body)
        except (urllib.error.URLError, OSError, TimeoutError, ValueError):
            raise RuntimeError("REVIEW_CONTEXT_UNAVAILABLE") from None

    def notify(self, completion):
        # The cache belongs to the worker. Spring receives the full payload and never fetches this JSON.
        result = self.store.read_json(completion["resultKey"])
        if self.processor is not None:
            result = self.processor.enrich(completion, result, self.store, self.remaining_ms)
        body = json.dumps(completion_body(completion, result), ensure_ascii=False).encode("utf-8")
        request = urllib.request.Request(self.url, data=body, method="POST", headers={
            "Content-Type": "application/json", "Authorization": "Bearer " + self.token})
        try:
            with self.opener.open(request, timeout=10) as response:
                if not 200 <= response.status < 300:
                    raise RuntimeError("COMPLETION_DELIVERY_FAILED")
                response.read(1024)
        except (urllib.error.URLError, OSError, TimeoutError):
            raise RuntimeError("COMPLETION_DELIVERY_FAILED") from None
