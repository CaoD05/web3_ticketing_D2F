# Events API Documentation

This document describes the current Events endpoints for frontend integration.

## Base URL

- Local: `http://localhost:5000`

## 1) Get All Events

- **Method:** `GET`
- **Path:** `/api/events`

### Success Response (200)

```json
{
  "ok": true,
  "data": [
    {
      "EventID": 1,
      "EventName": "Web3 Music Night",
      "MetaURL": "https://example.com/metadata/web3-music-night.json",
      "EventDate": "2026-05-01T19:30:00.000Z",
      "Location": "HCMC",
      "ContractAddress": "0x1234567890abcdef1234567890abcdef12345678",
      "TotalTickets": 500,
      "TicketsSold": 0,
      "CreatedBy": 1,
      "CreatedAt": "2026-04-09T16:30:00.000Z"
    }
  ]
}
```

### Error Response (500)

```json
{
  "ok": false,
  "message": "Failed to fetch events",
  "error": "Error detail here"
}
```

## 2) Create Event

- **Method:** `POST`
- **Path:** `/api/events`
- **Headers:** `Content-Type: application/json`

### Request Body

#### Required fields

- `EventName` (string, max 200 chars)
- `TotalTickets` (integer, > 0)

#### Optional fields

- `MetaURL` (string or null)
- `EventDate` (datetime string, e.g. ISO format)
- `Location` (string, max 200 chars)
- `ContractAddress` (string, max 42 chars)
- `TicketsSold` (integer, >= 0, default: `0`)
- `CreatedBy` (integer or null)

### Request Example

```json
{
  "EventName": "Web3 Music Night",
  "MetaURL": "https://example.com/metadata/web3-music-night.json",
  "EventDate": "2026-05-01T19:30:00Z",
  "Location": "HCMC",
  "ContractAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "TotalTickets": 500,
  "TicketsSold": 0,
  "CreatedBy": 1
}
```

### Success Response (201)

```json
{
  "ok": true,
  "message": "Event created successfully",
  "data": {
    "EventID": 2,
    "EventName": "Web3 Music Night",
    "MetaURL": "https://example.com/metadata/web3-music-night.json",
    "EventDate": "2026-05-01T19:30:00.000Z",
    "Location": "HCMC",
    "ContractAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "TotalTickets": 500,
    "TicketsSold": 0,
    "CreatedBy": 1,
    "CreatedAt": "2026-04-09T16:35:00.000Z"
  }
}
```

### Validation Error Responses (400)

```json
{
  "ok": false,
  "message": "EventName and TotalTickets are required"
}
```

```json
{
  "ok": false,
  "message": "TotalTickets must be a positive integer"
}
```

```json
{
  "ok": false,
  "message": "TicketsSold must be a non-negative integer"
}
```

```json
{
  "ok": false,
  "message": "EventDate must be a valid datetime"
}
```

```json
{
  "ok": false,
  "message": "CreatedBy must be an integer"
}
```

### Server Error (500)

```json
{
  "ok": false,
  "message": "Failed to create event",
  "error": "Error detail here"
}
```
