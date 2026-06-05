"""Helpers para extraer texto principal de una URL antes de enviarlo al agente FEVER."""

from __future__ import annotations

import re
import time
from html import unescape
from html.parser import HTMLParser
from typing import Dict, List, Optional
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request as UrlRequest, urlopen


URL_FETCH_TIMEOUT_SECONDS = 12
URL_MAX_DOWNLOAD_BYTES = 1_500_000
URL_TITLE_MAX_LENGTH = 220
URL_USER_AGENT = (
    "FakeNewsInsightBot/1.0 "
    "(+https://example.invalid/fakenews-insight)"
)


class UrlContrastValidationError(ValueError):
    """Error de entrada o contenido no apto para contraste FEVER."""


class UrlContrastFetchError(RuntimeError):
    """Error al recuperar la URL remota."""


def _normalize_whitespace(value: str) -> str:
    return re.sub(r"\s+", " ", unescape(value or "")).strip()


class _ReadableHtmlParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._ignored_depth = 0
        self._inside_title = False
        self._title_chunks: List[str] = []
        self._text_chunks: List[str] = []

    def handle_starttag(self, tag: str, attrs) -> None:  # noqa: ANN001
        normalized = (tag or "").lower()
        if normalized in {"script", "style", "noscript", "svg", "iframe"}:
            self._ignored_depth += 1
            return

        if normalized == "title":
            self._inside_title = True
            return

        if normalized in {"p", "article", "section", "main", "div", "li", "h1", "h2", "h3", "h4", "blockquote", "br"}:
            self._text_chunks.append("\n")

    def handle_endtag(self, tag: str) -> None:
        normalized = (tag or "").lower()
        if normalized in {"script", "style", "noscript", "svg", "iframe"} and self._ignored_depth > 0:
            self._ignored_depth -= 1
            return

        if normalized == "title":
            self._inside_title = False
            return

        if normalized in {"p", "article", "section", "main", "div", "li", "h1", "h2", "h3", "h4", "blockquote"}:
            self._text_chunks.append("\n")

    def handle_data(self, data: str) -> None:
        if self._ignored_depth > 0:
            return

        normalized = _normalize_whitespace(data)
        if not normalized:
            return

        if self._inside_title:
            self._title_chunks.append(normalized)
            return

        self._text_chunks.append(normalized)

    @property
    def title(self) -> str:
        return _normalize_whitespace(" ".join(self._title_chunks))[:URL_TITLE_MAX_LENGTH]

    @property
    def text(self) -> str:
        joined = " ".join(self._text_chunks)
        normalized = re.sub(r"(?:\s*\n\s*)+", "\n", joined)
        normalized = re.sub(r"\s+", " ", normalized)
        return normalized.strip()


def _truncate_text(text: str, max_chars: int) -> str:
    if max_chars <= 0 or len(text) <= max_chars:
        return text

    candidate = text[: max_chars + 1].rsplit(" ", 1)[0].strip()
    return candidate or text[:max_chars].strip()


def _read_response_body(response) -> bytes:  # noqa: ANN001
    chunks: List[bytes] = []
    downloaded = 0
    deadline = time.monotonic() + URL_FETCH_TIMEOUT_SECONDS

    while True:
        if time.monotonic() > deadline:
            raise UrlContrastFetchError(
                "La descarga de la URL tardó demasiado."
            )

        chunk = response.read(65536)

        if time.monotonic() > deadline:
            raise UrlContrastFetchError(
                "La descarga de la URL tardó demasiado."
            )

        if not chunk:
            break

        downloaded += len(chunk)
        if downloaded > URL_MAX_DOWNLOAD_BYTES:
            raise UrlContrastValidationError(
                "La pagina es demasiado grande para procesarla en esta version."
            )

        chunks.append(chunk)

    return b"".join(chunks)


def extract_verification_input_from_url(
    *,
    url: str,
    max_chars: int,
    min_chars: int,
) -> Dict[str, Optional[str]]:
    normalized_url = str(url or "").strip()
    parsed_url = urlparse(normalized_url)
    if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
        raise UrlContrastValidationError("Debes indicar una URL HTTP o HTTPS valida.")

    request = UrlRequest(
        normalized_url,
        headers={
            "User-Agent": URL_USER_AGENT,
            "Accept": "text/html,text/plain;q=0.9,*/*;q=0.1",
        },
        method="GET",
    )

    try:
        with urlopen(request, timeout=URL_FETCH_TIMEOUT_SECONDS) as response:
            content_type = str(response.headers.get("Content-Type") or "").lower()
            final_url = response.geturl() or normalized_url
            raw_body = _read_response_body(response)
            charset = response.headers.get_content_charset() or "utf-8"
    except HTTPError as exc:
        raise UrlContrastFetchError(
            f"La URL devolvio un error HTTP {exc.code}."
        ) from exc
    except URLError as exc:
        raise UrlContrastFetchError(
            "No se pudo descargar la URL indicada."
        ) from exc

    try:
        decoded_body = raw_body.decode(charset, errors="ignore")
    except LookupError:
        decoded_body = raw_body.decode("utf-8", errors="ignore")

    if "text/plain" in content_type:
        extracted_text = _normalize_whitespace(decoded_body)
        source_title = parsed_url.netloc
    elif "text/html" in content_type or "application/xhtml+xml" in content_type or not content_type:
        parser = _ReadableHtmlParser()
        parser.feed(decoded_body)
        parser.close()
        extracted_text = parser.text
        source_title = parser.title or parsed_url.netloc
    else:
        raise UrlContrastValidationError(
            "La URL no apunta a una pagina HTML o texto plano compatible."
        )

    if not extracted_text:
        raise UrlContrastValidationError(
            "No se pudo extraer contenido legible de la URL indicada."
        )

    truncated_text = _truncate_text(extracted_text, max_chars=max_chars)
    if len(truncated_text) < min_chars:
        raise UrlContrastValidationError(
            f"La URL no contiene suficiente texto legible para verificar. Se requieren al menos {min_chars} caracteres útiles."
        )

    return {
        "input_text": truncated_text,
        "source_url": final_url,
        "source_title": (source_title or parsed_url.netloc or normalized_url)[:URL_TITLE_MAX_LENGTH],
    }