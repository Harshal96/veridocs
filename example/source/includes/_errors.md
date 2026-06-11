# Errors

> Error responses share a common shape:

```json
{
  "error": {
    "type": "invalid_request",
    "code": "parameter_missing",
    "message": "lat is required",
    "doc_url": "https://docs.aurora.example/#errors"
  }
}
```

The Aurora API uses conventional HTTP response codes to indicate the success
or failure of a request.

Error Code | Meaning
---------- | -------
400 | Bad Request — your request is malformed or missing parameters.
401 | Unauthorized — your API key is wrong or has been revoked.
403 | Forbidden — your plan does not include this endpoint.
404 | Not Found — the specified resource could not be found.
405 | Method Not Allowed — you tried to access a resource with an invalid method.
410 | Gone — the resource requested has been removed from our servers.
429 | Too Many Requests — slow down, or upgrade your plan for higher limits.
500 | Internal Server Error — we had a problem. Try again later.
503 | Service Unavailable — we're temporarily offline for maintenance.

<aside class="warning">
Requests rejected with <code>429</code> include a <code>Retry-After</code>
header — please honor it.
</aside>
