# Pagination

> Fetching the next page:

```shell
curl "https://api.aurora.example/v1/forecasts?starting_after=fc_01hw2k9" \
  -H "Authorization: Bearer au_live_9aK3xPzn"
```

```ruby
client.forecasts.list(starting_after: 'fc_01hw2k9')
```

```python
client.forecasts.list(starting_after="fc_01hw2k9")
```

```javascript
await client.forecasts.list({ startingAfter: "fc_01hw2k9" });
```

All list endpoints share a cursor-based pagination scheme. Responses include
a `has_more` flag; pass the last item's `id` as `starting_after` to fetch the
next page.

Parameter | Default | Description
--------- | ------- | -----------
limit | 10 | Number of items per page (1–100).
starting_after | — | Item ID to start the page after.
ending_before | — | Item ID to end the page before.
