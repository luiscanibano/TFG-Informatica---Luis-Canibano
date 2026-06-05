from __future__ import annotations

import pytest

import url_contrast


class _SlowResponse:
    def __init__(self) -> None:
        self._reads = 0

    def read(self, _chunk_size: int) -> bytes:
        self._reads += 1
        if self._reads == 1:
            return b"contenido parcial"
        return b""


def test_read_response_body_aborts_when_total_download_time_is_exceeded(monkeypatch):
    ticks = iter([0.0, 0.0, url_contrast.URL_FETCH_TIMEOUT_SECONDS + 1.0])
    monkeypatch.setattr(url_contrast.time, "monotonic", lambda: next(ticks))

    with pytest.raises(url_contrast.UrlContrastFetchError, match="tardó demasiado"):
        url_contrast._read_response_body(_SlowResponse())