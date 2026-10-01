"""Thin server-side client for the JobsPipe API.

The API key is read from settings (env) and never leaves the server.
Responses are cached because JobsPipe bills one credit per job returned.
"""
import hashlib
import json
import re

import requests
from django.conf import settings
from django.core.cache import cache

SEARCH_TTL = 60 * 10          # 10 minutes
STACK_TTL = 60 * 60 * 24 * 7  # JobsPipe itself caches scans for 7 days
DOMAIN_RE = re.compile(r"^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$")


class JobsPipeError(Exception):
    def __init__(self, message, status=502):
        super().__init__(message)
        self.message = message
        self.status = status


def _post(path, payload, allow_sandbox=False):
    key = settings.JOBSPIPE_API_KEY
    headers = {"Content-Type": "application/json"}
    if key:
        headers["Authorization"] = f"Bearer {key}"
        url = f"{settings.JOBSPIPE_BASE_URL}/v1/{path}"
    elif allow_sandbox:
        url = f"{settings.JOBSPIPE_BASE_URL}/v1/sandbox/{path}"
    else:
        raise JobsPipeError("JobsPipe API key is not configured on the server.", 503)

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=25)
    except requests.RequestException:
        raise JobsPipeError("Could not reach JobsPipe. Try again shortly.")

    if resp.status_code in (401, 403):
        raise JobsPipeError("JobsPipe rejected the API key. Check JOBSPIPE_API_KEY on the server.", 502)
    if resp.status_code == 402:
        raise JobsPipeError("JobsPipe credits are used up for this key.", 402)
    if resp.status_code == 429:
        raise JobsPipeError("JobsPipe rate limit reached. Try again in a moment.", 429)
    if resp.status_code == 400:
        raise JobsPipeError("JobsPipe did not accept this search. Try different filters.", 400)
    if not resp.ok:
        raise JobsPipeError(f"JobsPipe returned an error ({resp.status_code}).")
    try:
        return resp.json()
    except ValueError:
        raise JobsPipeError("JobsPipe returned an unreadable response.")


def _first_list(raw, keys=("data", "jobs", "results", "items")):
    if isinstance(raw, list):
        return raw
    if isinstance(raw, dict):
        for k in keys:
            if isinstance(raw.get(k), list):
                return raw[k]
    return []


def _plain(text, limit=1200):
    text = re.sub(r"[#*_`>]+", "", text or "")
    text = re.sub(r"\s+\n", "\n", text).strip()
    return text[:limit].rstrip() + ("…" if len(text) > limit else "")


def normalize_job(j):
    sources = j.get("sources") or []
    first_source = sources[0] if sources and isinstance(sources[0], dict) else {}
    return {
        "id": str(j.get("id", "")),
        "title": j.get("job_title") or j.get("title") or "Untitled role",
        "company": j.get("company") or "",
        "company_domain": j.get("company_domain") or "",
        "location": j.get("location") or "",
        "remote": bool(j.get("remote")),
        "work_arrangement": j.get("work_arrangement") or "",
        "seniority": j.get("seniority") or "",
        "salary_min": j.get("min_annual_salary_usd"),
        "salary_max": j.get("max_annual_salary_usd"),
        "salary_currency": "USD",
        "date_posted": j.get("date_posted") or j.get("discovered_at") or "",
        "technologies": (j.get("technology_slugs") or [])[:8],
        "apply_url": j.get("apply_url") or first_source.get("url") or "",
        "source": first_source.get("provider") or "",
        "snippet": _plain(j.get("description")),
    }


def search_jobs(q="", location="", country="", remote=False, cursor="", limit=10):
    payload = {"status": "active", "limit": max(1, min(int(limit), 25))}
    if q:
        payload["job_title_or"] = [q]
    if location:
        payload["job_location_or"] = [location]
    if country:
        payload["job_country_code_or"] = [country.upper()]
    if remote:
        payload["remote"] = True
    if cursor:
        payload["cursor"] = cursor

    cache_key = "jp:search:" + hashlib.sha1(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    hit = cache.get(cache_key)
    if hit:
        return hit

    raw = _post("jobs/search", payload, allow_sandbox=True)
    meta = raw.get("metadata") if isinstance(raw, dict) and isinstance(raw.get("metadata"), dict) else {}
    result = {
        "results": [normalize_job(j) for j in _first_list(raw) if isinstance(j, dict)],
        "next_cursor": meta.get("next_cursor") or None,
        "total": meta.get("total") or meta.get("total_count"),
        "sandbox": not settings.JOBSPIPE_API_KEY,
    }
    cache.set(cache_key, result, SEARCH_TTL)
    return result


def valid_domain(domain):
    domain = (domain or "").strip().lower()
    domain = re.sub(r"^https?://", "", domain).split("/")[0]
    domain = domain[4:] if domain.startswith("www.") else domain
    return domain if DOMAIN_RE.match(domain) else None


def scan_stack(domain):
    cache_key = f"jp:stack:{domain}"
    hit = cache.get(cache_key)
    if hit:
        return hit

    raw = _post("stack/scan", {"domain": domain})
    items = _first_list(raw, keys=("technologies", "detections", "data", "results"))
    techs = []
    for t in items:
        if not isinstance(t, dict):
            continue
        category = t.get("category")
        if not category and isinstance(t.get("categories"), list) and t["categories"]:
            category = t["categories"][0]
        techs.append({
            "name": t.get("name") or t.get("technology") or t.get("slug") or "Unknown",
            "category": category if isinstance(category, str) else "",
            "confidence": t.get("confidence"),
        })
    techs.sort(key=lambda x: (x["confidence"] is None, -(x["confidence"] or 0)))
    result = {"domain": domain, "technologies": techs}
    cache.set(cache_key, result, STACK_TTL)
    return result
