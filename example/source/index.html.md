---
title: Aurora API Reference

language_tabs:
  - shell: cURL
  - ruby
  - python
  - javascript

toc_footers:
  - <a href='https://github.com/harshalparekh/veridocs'>Built with Veridocs ✦</a>
  - <a href='#'>Sign up for an API key</a>

includes:
  - pagination
  - errors

search: true

code_clipboard: true

meta:
  - name: description
    content: Documentation for the Aurora polar-lights forecasting API
---

# Introduction

Welcome to the **Aurora API** — programmatic forecasts of the northern (and
southern) lights. Query real-time geomagnetic activity, fetch multi-day
visibility forecasts for any location on Earth, and register alerts so your
users never miss a storm.

We have language bindings in Shell, Ruby, Python, and JavaScript. You can view
code examples in the dark panel to the right, and switch between languages
with the tabs in the top bar.

This documentation page was generated with [Veridocs](https://github.com/harshalparekh/veridocs),
a free, Slate-compatible API documentation generator. Fork it, point it at
your own markdown, and ship docs like these in minutes.

# Authentication

> To authorize, pass your API key with every request:

```shell
# With cURL, you can just pass the correct header with each request
curl "https://api.aurora.example/v1/status" \
  -H "Authorization: Bearer au_live_9aK3xPzn"
```

```ruby
require 'aurora'

client = Aurora::Client.new(api_key: 'au_live_9aK3xPzn')
```

```python
import aurora

client = aurora.Client(api_key="au_live_9aK3xPzn")
```

```javascript
import { Aurora } from "aurora";

const client = new Aurora({ apiKey: "au_live_9aK3xPzn" });
```

> Make sure to replace `au_live_9aK3xPzn` with your own API key.

The Aurora API uses keys to authenticate requests. You can view and manage
your keys in the [developer dashboard](#). Keys look like
`au_live_…` for production and `au_test_…` for the sandbox.

Authentication is performed via the `Authorization` header on every request:

`Authorization: Bearer au_live_9aK3xPzn`

<aside class="notice">
You must replace <code>au_live_9aK3xPzn</code> with your personal API key.
</aside>

<aside class="warning">
Never ship an API key in client-side code. Calls from browsers should go
through your own backend.
</aside>

# Forecasts

## Get all forecasts

> Example request:

```shell
curl "https://api.aurora.example/v1/forecasts?lat=64.84&lon=-147.72" \
  -H "Authorization: Bearer au_live_9aK3xPzn"
```

```ruby
client.forecasts.list(lat: 64.84, lon: -147.72)
```

```python
client.forecasts.list(lat=64.84, lon=-147.72)
```

```javascript
const forecasts = await client.forecasts.list({
  lat: 64.84,
  lon: -147.72,
});
```

> Example response:

```json
{
  "data": [
    {
      "id": "fc_01hw2k9",
      "night_of": "2026-03-02",
      "kp_index": 6.3,
      "visibility": "high",
      "cloud_cover": 0.15,
      "best_window": {
        "start": "2026-03-02T22:30:00-09:00",
        "end": "2026-03-03T01:45:00-09:00"
      }
    }
  ],
  "has_more": true
}
```

This endpoint returns aurora visibility forecasts for the next several nights
at a given location, sorted soonest-first.

### HTTP Request

`GET https://api.aurora.example/v1/forecasts`

### Query Parameters

Parameter | Default | Description
--------- | ------- | -----------
lat | — | **Required.** Latitude of the observation point.
lon | — | **Required.** Longitude of the observation point.
nights | 3 | Number of nights to forecast (1–10).
min_kp | 0 | Only include nights with a predicted Kp index at or above this value.
include_clouds | true | If `false`, skips the cloud-cover model for faster responses.

<aside class="success">
Forecasts are cached for 5 minutes — feel free to poll.
</aside>

## Get a specific forecast

> Example request:

```shell
curl "https://api.aurora.example/v1/forecasts/fc_01hw2k9" \
  -H "Authorization: Bearer au_live_9aK3xPzn"
```

```ruby
client.forecasts.get('fc_01hw2k9')
```

```python
client.forecasts.get("fc_01hw2k9")
```

```javascript
const forecast = await client.forecasts.get("fc_01hw2k9");
```

> Example response:

```json
{
  "id": "fc_01hw2k9",
  "night_of": "2026-03-02",
  "kp_index": 6.3,
  "visibility": "high",
  "viewing_tips": "Face north, away from city lights. Peak activity near midnight."
}
```

Retrieves a single forecast by its identifier, including extended viewing
notes not present in list responses.

### HTTP Request

`GET https://api.aurora.example/v1/forecasts/<ID>`

### URL Parameters

Parameter | Description
--------- | -----------
ID | The identifier of the forecast to retrieve.

# Alerts

## Create an alert

> Example request:

```shell
curl -X POST "https://api.aurora.example/v1/alerts" \
  -H "Authorization: Bearer au_live_9aK3xPzn" \
  -H "Content-Type: application/json" \
  -d '{"lat": 69.65, "lon": 18.96, "min_kp": 5, "channel": "webhook", "target": "https://example.com/hooks/aurora"}'
```

```ruby
client.alerts.create(
  lat: 69.65,
  lon: 18.96,
  min_kp: 5,
  channel: 'webhook',
  target: 'https://example.com/hooks/aurora'
)
```

```python
client.alerts.create(
    lat=69.65,
    lon=18.96,
    min_kp=5,
    channel="webhook",
    target="https://example.com/hooks/aurora",
)
```

```javascript
const alert = await client.alerts.create({
  lat: 69.65,
  lon: 18.96,
  minKp: 5,
  channel: "webhook",
  target: "https://example.com/hooks/aurora",
});
```

> Example response:

```json
{
  "id": "al_8821fd",
  "status": "active",
  "min_kp": 5,
  "channel": "webhook"
}
```

Registers an alert. When the predicted Kp index for the location crosses your
threshold, we notify the configured channel.

### HTTP Request

`POST https://api.aurora.example/v1/alerts`

### Body Parameters

Parameter | Type | Description
--------- | ---- | -----------
lat | number | **Required.** Latitude to monitor.
lon | number | **Required.** Longitude to monitor.
min_kp | number | Kp index threshold that triggers the alert. Defaults to `5`.
channel | string | One of `webhook`, `email`, or `sms`.
target | string | Webhook URL, email address, or phone number for the channel.

## Delete an alert

> Example request:

```shell
curl -X DELETE "https://api.aurora.example/v1/alerts/al_8821fd" \
  -H "Authorization: Bearer au_live_9aK3xPzn"
```

```ruby
client.alerts.delete('al_8821fd')
```

```python
client.alerts.delete("al_8821fd")
```

```javascript
await client.alerts.delete("al_8821fd");
```

> Example response:

```json
{
  "id": "al_8821fd",
  "deleted": true
}
```

Deletes an alert. Deleted alerts stop firing immediately and cannot be
restored.

### HTTP Request

`DELETE https://api.aurora.example/v1/alerts/<ID>`

# Webhooks

> Webhook payloads look like this:

```json
{
  "type": "aurora.visible",
  "created": "2026-03-02T21:14:09Z",
  "data": {
    "alert_id": "al_8821fd",
    "kp_index": 6.1,
    "visibility": "high",
    "best_window": {
      "start": "2026-03-02T22:30:00-09:00",
      "end": "2026-03-03T01:45:00-09:00"
    }
  }
}
```

> Verify signatures by comparing the `Aurora-Signature` header with an
> HMAC-SHA256 of the raw body:

```python
import hashlib
import hmac

def verify(raw_body: bytes, header: str, secret: str) -> bool:
    digest = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(digest, header)
```

```javascript
import { createHmac, timingSafeEqual } from "node:crypto";

function verify(rawBody, header, secret) {
  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  return timingSafeEqual(Buffer.from(digest), Buffer.from(header));
}
```

When an alert fires, we `POST` a JSON payload to your webhook URL. Every
delivery is signed with your webhook secret so you can verify it really came
from us.

Event | When it fires
----- | -------------
`aurora.visible` | Predicted Kp crosses the alert threshold.
`aurora.window_updated` | The best viewing window shifts by more than 30 minutes.
`aurora.all_clear` | Activity drops back below the threshold.

<aside class="notice">
Webhook deliveries are retried with exponential backoff for up to 24 hours.
</aside>
