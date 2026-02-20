# {{API_NAME}} API Documentation

## Overview

{{API_DESCRIPTION}}

**Base URL**: `{{BASE_URL}}`
**Version**: {{API_VERSION}}

---

## Authentication

All API requests require authentication using one of the following methods:

### Bearer Token (JWT)
```
Authorization: Bearer <token>
```

### API Key
```
X-API-Key: <your-api-key>
```

---

## Rate Limiting

| Tier | Requests/Minute | Daily Limit |
|------|-----------------|-------------|
| Free | 60 | 1,000 |
| Pro | 600 | 50,000 |
| Enterprise | 6,000 | Unlimited |

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Max requests per window
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp when window resets

---

## Response Format

### Success Response
```json
{
  "data": {
    // Resource or array of resources
  },
  "meta": {
    "requestId": "req_abc123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Error Response
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "requestId": "req_abc123"
  }
}
```

### Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid request body or parameters |
| UNAUTHORIZED | 401 | Missing or invalid authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource conflict (e.g., duplicate) |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

---

## Endpoints

### {{RESOURCE_NAME}}

#### List {{RESOURCE_NAME_PLURAL}}
```
GET /api/{{RESOURCE_PATH}}
```

**Query Parameters**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | integer | No | Page number (default: 1) |
| perPage | integer | No | Items per page (default: 20, max: 100) |
| search | string | No | Search query |
| sortBy | string | No | Field to sort by |
| sortOrder | string | No | Sort direction (asc/desc) |

**Example Request**
```bash
curl -X GET "{{BASE_URL}}/api/{{RESOURCE_PATH}}?page=1&perPage=20" \
  -H "Authorization: Bearer <token>"
```

**Example Response**
```json
{
  "data": [
    {
      "id": "123",
      "name": "Example",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "perPage": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

#### Get {{RESOURCE_NAME}}
```
GET /api/{{RESOURCE_PATH}}/:id
```

**Path Parameters**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Resource ID |

**Example Request**
```bash
curl -X GET "{{BASE_URL}}/api/{{RESOURCE_PATH}}/123" \
  -H "Authorization: Bearer <token>"
```

**Example Response**
```json
{
  "data": {
    "id": "123",
    "name": "Example",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

#### Create {{RESOURCE_NAME}}
```
POST /api/{{RESOURCE_PATH}}
```

**Request Body**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Resource name |
| description | string | No | Resource description |

**Example Request**
```bash
curl -X POST "{{BASE_URL}}/api/{{RESOURCE_PATH}}" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Resource"}'
```

**Example Response** (201 Created)
```json
{
  "data": {
    "id": "124",
    "name": "New Resource",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

#### Update {{RESOURCE_NAME}}
```
PATCH /api/{{RESOURCE_PATH}}/:id
```

**Path Parameters**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| id | string | Yes | Resource ID |

**Request Body**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | No | Updated name |
| description | string | No | Updated description |

**Example Request**
```bash
curl -X PATCH "{{BASE_URL}}/api/{{RESOURCE_PATH}}/123" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'
```

---

#### Delete {{RESOURCE_NAME}}
```
DELETE /api/{{RESOURCE_PATH}}/:id
```

**Example Request**
```bash
curl -X DELETE "{{BASE_URL}}/api/{{RESOURCE_PATH}}/123" \
  -H "Authorization: Bearer <token>"
```

**Response**: 204 No Content

---

## Webhooks

### Event Types
| Event | Description |
|-------|-------------|
| {{RESOURCE_PATH}}.created | New resource created |
| {{RESOURCE_PATH}}.updated | Resource updated |
| {{RESOURCE_PATH}}.deleted | Resource deleted |

### Webhook Payload
```json
{
  "event": "{{RESOURCE_PATH}}.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "123",
    "name": "New Resource"
  }
}
```

---

## SDKs

- **JavaScript/TypeScript**: `npm install @{{ORG}}/{{API_NAME}}-sdk`
- **Python**: `pip install {{API_NAME}}-sdk`
- **Go**: `go get github.com/{{ORG}}/{{API_NAME}}-go`

---

## Changelog

### v{{API_VERSION}} ({{DATE}})
- Initial release

---

## Support

- **Documentation**: {{DOCS_URL}}
- **API Status**: {{STATUS_URL}}
- **Email**: {{SUPPORT_EMAIL}}
