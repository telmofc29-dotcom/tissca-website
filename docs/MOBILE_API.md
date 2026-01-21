# BUILDR Mobile API Documentation

**Version:** 1.0.0  
**Status:** Stable (Ready for Mobile App Integration)  
**Last Updated:** 2024

## Overview

The BUILDR Mobile API provides a complete set of endpoints for iOS and Android apps to access the shared business logic layer. All endpoints use the same calculation, document generation, and profile management services as the web platform, ensuring 100% consistency across platforms.

### Key Principles

- **Shared Logic**: All apps (web, iOS, Android) use identical calculation and document generation services
- **Stateless API**: All state is managed by the client app (localStorage for web, SQLite/Realm for mobile)
- **JSON-Serializable**: All responses are JSON-compatible for offline syncing
- **No Logic Duplication**: Mobile apps import shared services directly, not reimplementing calculations

---

## Base URL

```
https://buildr.app/api/mobile
```

## Authentication

*Future: JWT token-based authentication*

Current: Requests are user-scoped via `userId` query parameter (development only).

```bash
GET /api/mobile/profiles?userId=user123
```

## Response Format

All responses follow a standard envelope:

### Success Response
```json
{
  "success": true,
  "data": { /* specific endpoint data */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

---

## Endpoints

### 1. Calculations

#### POST /api/mobile/calculate
Execute any supported calculation (area-based, kitchen, bathroom, wardrobe).

**Request**
```typescript
POST /api/mobile/calculate
Content-Type: application/json

{
  "type": "area-based", // or "kitchen", "bathroom", "wardrobe"
  "input": {
    "area": 50,           // square meters (for area-based)
    "trade": "painting",  // painting, tiling, plastering, flooring, etc.
    "mode": "standard",   // budget, standard, or premium
    "difficulty": "standard", // easy, standard, or hard
    "region": "london"    // london, south-east, midlands, north, scotland
  }
}
```

**Response (200 OK)**
```json
{
  "success": true,
  "result": {
    "estimatedDays": 2.5,
    "labourCost": 625.00,
    "breakdown": {
      "baseRate": 250,
      "difficultyMultiplier": 1.0,
      "regionMultiplier": 1.35,
      "finalRate": 337.50
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**Kitchen Calculation Example**
```json
{
  "type": "kitchen",
  "input": {
    "trade": "kitchen-fitter",
    "mode": "premium",
    "difficulty": "hard",
    "region": "south-east",
    "cabinetStyle": "bespoke",
    "applianceCount": 5
  }
}
```

**Error Responses**
- `400 Bad Request` - Invalid calculation type or missing required fields
- `500 Internal Server Error` - Calculation error

---

### 2. Quotes

#### POST /api/mobile/quotes
Create a new quote document.

**Request**
```json
{
  "businessInfo": {
    "name": "ABC Builders",
    "email": "contact@abc.com",
    "phone": "020 1234 5678",
    "address": "123 Main St",
    "city": "London",
    "postcode": "SW1A 1AA",
    "vatNumber": "GB123456789"
  },
  "clientInfo": {
    "name": "Client Name",
    "email": "client@example.com",
    "phone": "020 9999 8888"
  },
  "lineItems": [
    {
      "id": "item-1",
      "description": "Interior painting (50 sqm)",
      "quantity": 50,
      "unitPrice": 12.50
    },
    {
      "id": "item-2",
      "description": "Labour (2.5 days)",
      "quantity": 2.5,
      "unitPrice": 250.00
    }
  ],
  "vatRate": 20,
  "notes": "Valid for 30 days",
  "terms": "50% deposit required"
}
```

**Response (200 OK)**
```json
{
  "success": true,
  "quote": {
    "id": "Q-000042",
    "number": "Q-000042",
    "date": "2024-01-15T10:30:00Z",
    "validUntil": "2024-02-14T10:30:00Z",
    "total": 812.50,
    "clientName": "Client Name"
  }
}
```

#### GET /api/mobile/quotes?id=Q-000042
Fetch a specific quote.

**Response (200 OK)**
```json
{
  "success": true,
  "quote": {
    "id": "Q-000042",
    "number": "Q-000042",
    "type": "quote",
    "date": "2024-01-15T10:30:00Z",
    "validUntil": "2024-02-14T10:30:00Z",
    "business": { /* BusinessInfo */ },
    "client": { /* ClientInfo */ },
    "lineItems": [ /* LineItem[] */ ],
    "subtotal": 662.50,
    "vatRate": 20,
    "vat": 132.50,
    "total": 795.00
  }
}
```

#### PUT /api/mobile/quotes?id=Q-000042
Update a draft quote (before sending).

**Request**
```json
{
  "notes": "Updated notes",
  "terms": "New payment terms"
}
```

**Response (200 OK)**
```json
{
  "success": true,
  "quote": {
    "id": "Q-000042",
    "number": "Q-000042",
    "total": 795.00
  }
}
```

**Error Responses**
- `400 Bad Request` - Missing required fields (businessInfo.name, lineItems)
- `404 Not Found` - Quote not found
- `500 Internal Server Error` - Server error

---

### 3. Invoices

#### POST /api/mobile/invoices
Create a new invoice document.

**Request**
```json
{
  "businessInfo": {
    "name": "ABC Builders",
    "email": "contact@abc.com",
    "phone": "020 1234 5678",
    "address": "123 Main St",
    "city": "London",
    "postcode": "SW1A 1AA",
    "vatNumber": "GB123456789"
  },
  "clientInfo": {
    "name": "Client Name",
    "email": "client@example.com",
    "address": "456 Oak Ave",
    "city": "Manchester",
    "postcode": "M1 1AA"
  },
  "lineItems": [
    {
      "id": "item-1",
      "description": "Interior painting (50 sqm)",
      "quantity": 50,
      "unitPrice": 12.50
    }
  ],
  "vatRate": 20,
  "paymentTerms": 30,
  "notes": "Payment due within 30 days"
}
```

**Response (200 OK)**
```json
{
  "success": true,
  "invoice": {
    "id": "INV-000128",
    "number": "INV-000128",
    "date": "2024-01-15T10:30:00Z",
    "dueDate": "2024-02-14T10:30:00Z",
    "total": 750.00,
    "clientName": "Client Name"
  }
}
```

#### GET /api/mobile/invoices?id=INV-000128
Fetch a specific invoice.

**Response (200 OK)**
```json
{
  "success": true,
  "invoice": {
    "id": "INV-000128",
    "number": "INV-000128",
    "type": "invoice",
    "date": "2024-01-15T10:30:00Z",
    "dueDate": "2024-02-14T10:30:00Z",
    "status": "sent",
    "business": { /* BusinessInfo */ },
    "client": { /* ClientInfo */ },
    "lineItems": [ /* LineItem[] */ ],
    "subtotal": 625.00,
    "vatRate": 20,
    "vat": 125.00,
    "total": 750.00
  }
}
```

#### PUT /api/mobile/invoices?id=INV-000128
Update invoice (status, notes, payment info).

**Request**
```json
{
  "status": "paid",
  "notes": "Payment received 2024-01-20"
}
```

**Response (200 OK)**
```json
{
  "success": true,
  "invoice": {
    "id": "INV-000128",
    "number": "INV-000128",
    "total": 750.00,
    "notes": "Payment received 2024-01-20"
  }
}
```

**Error Responses**
- `400 Bad Request` - Missing required field (clientInfo.name is required for invoices)
- `404 Not Found` - Invoice not found
- `409 Conflict` - Invoice cannot be modified after sent
- `500 Internal Server Error` - Server error

---

### 4. Business Profiles

#### GET /api/mobile/profiles?userId=user123
Fetch the current user's business profile.

**Response (200 OK)**
```json
{
  "success": true,
  "profile": {
    "id": "profile-abc123",
    "name": "ABC Builders Ltd",
    "email": "contact@abc.com",
    "phone": "020 1234 5678",
    "address": "123 Main St",
    "city": "London",
    "postcode": "SW1A 1AA",
    "country": "UK",
    "vatNumber": "GB123456789",
    "companyNumber": "12345678",
    "defaultPricingMode": "standard",
    "defaultRegion": "london",
    "defaultVatRate": 20,
    "defaultPaymentTerms": 30,
    "defaultCurrency": "GBP",
    "invoicePrefix": "INV",
    "quotePrefix": "Q",
    "nextInvoiceNumber": 129,
    "nextQuoteNumber": 43,
    "createdAt": "2023-06-01T00:00:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

#### POST /api/mobile/profiles?userId=user123
Create a new business profile (first-time setup).

**Request**
```json
{
  "name": "ABC Builders Ltd",
  "email": "contact@abc.com",
  "phone": "020 1234 5678",
  "address": "123 Main St",
  "city": "London",
  "postcode": "SW1A 1AA",
  "country": "UK",
  "vatNumber": "GB123456789",
  "defaultPricingMode": "standard",
  "defaultRegion": "london"
}
```

**Response (201 Created)**
```json
{
  "success": true,
  "profile": { /* Full profile object */ }
}
```

#### PUT /api/mobile/profiles?userId=user123
Update business profile.

**Request**
```json
{
  "email": "newemail@abc.com",
  "phone": "020 9999 7777",
  "defaultPricingMode": "premium",
  "accountHolder": "John Smith",
  "accountNumber": "12345678",
  "sortCode": "20-00-00"
}
```

**Response (200 OK)**
```json
{
  "success": true,
  "profile": { /* Updated profile object */ }
}
```

**Error Responses**
- `400 Bad Request` - Invalid email, VAT number, or company number format
- `404 Not Found` - Profile not found
- `409 Conflict` - Profile already exists (when POSTing)
- `500 Internal Server Error` - Server error

**Validation Rules**
- Email: Must be valid email format
- VAT Number: Must be "GB" + 9 digits (e.g., "GB123456789")
- Company Number: Must be exactly 8 digits

---

### 5. Pricing & Trade Data

#### GET /api/mobile/pricing/trades
Fetch all available trades with details.

**Response (200 OK)**
```json
{
  "success": true,
  "trades": [
    {
      "id": "painting",
      "name": "Painting",
      "category": "finishing",
      "description": "Interior and exterior painting"
    },
    {
      "id": "tiling",
      "name": "Tiling",
      "category": "finishing",
      "description": "Wall and floor tiling"
    }
    // ... 8 more trades
  ]
}
```

#### GET /api/mobile/pricing/modes
Fetch all pricing modes.

**Response (200 OK)**
```json
{
  "success": true,
  "modes": [
    {
      "id": "budget",
      "name": "Budget",
      "multiplier": 0.75,
      "description": "Cost-effective estimates"
    },
    {
      "id": "standard",
      "name": "Standard",
      "multiplier": 1.0,
      "description": "Fair market rates"
    },
    {
      "id": "premium",
      "name": "Premium",
      "multiplier": 1.5,
      "description": "Premium quality work"
    }
  ]
}
```

#### GET /api/mobile/pricing/regions
Fetch all UK regions with multipliers.

**Response (200 OK)**
```json
{
  "success": true,
  "regions": [
    {
      "id": "london",
      "name": "London",
      "multiplier": 1.35
    },
    {
      "id": "south-east",
      "name": "South East",
      "multiplier": 1.20
    },
    {
      "id": "midlands",
      "name": "Midlands",
      "multiplier": 1.0
    },
    {
      "id": "north",
      "name": "North",
      "multiplier": 0.95
    },
    {
      "id": "scotland",
      "name": "Scotland",
      "multiplier": 0.98
    }
  ]
}
```

#### GET /api/mobile/pricing/trade?tradeId=painting
Fetch details for a specific trade (rates, productivity, difficulty multipliers).

**Response (200 OK)**
```json
{
  "success": true,
  "trade": {
    "id": "painting",
    "name": "Painting",
    "category": "finishing",
    "description": "Interior and exterior painting",
    "dailyRate": 250.00,
    "productivity": 50,
    "productivityUnit": "sqm/day",
    "difficultyMultiplier": {
      "easy": 0.9,
      "standard": 1.0,
      "hard": 1.25
    }
  }
}
```

---

## Mobile Implementation Guide

### iOS (Swift)

```swift
import Foundation

class BUILDRMobileAPI {
  let baseURL = "https://buildr.app/api/mobile"
  let userId: String
  
  func calculate(type: String, input: [String: Any]) async throws {
    let url = URL(string: "\(baseURL)/calculate")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONSerialization.data(withJSONObject: ["type": type, "input": input])
    
    let (data, response) = try await URLSession.shared.data(for: request)
    let result = try JSONDecoder().decode(CalculationResponse.self, from: data)
    // Use result...
  }
}
```

### Android (Kotlin)

```kotlin
import retrofit2.http.*
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

interface BUILDRMobileAPI {
  @POST("/calculate")
  suspend fun calculate(@Body request: CalculationRequest): ApiResponse<CalculationResponse>
  
  @POST("/quotes")
  suspend fun createQuote(@Body request: CreateQuoteRequest): ApiResponse<CreateQuoteResponse>
  
  @GET("/profiles")
  suspend fun getProfile(@Query("userId") userId: String): ApiResponse<BusinessProfile>
}

val retrofit = Retrofit.Builder()
  .baseUrl("https://buildr.app/api/mobile")
  .addConverterFactory(GsonConverterFactory.create())
  .build()

val api = retrofit.create(BUILDRMobileAPI::class.java)
```

### React Native (TypeScript)

```typescript
import { ApiResponse, CalculationRequest, CalculationResponse } from '@buildr/mobile-types';

class BUILDRMobileAPI {
  private baseURL = 'https://buildr.app/api/mobile';
  
  async calculate(type: string, input: Record<string, any>) {
    const response = await fetch(`${this.baseURL}/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, input }),
    });
    
    const data: ApiResponse<CalculationResponse> = await response.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  }
}
```

---

## Offline-First Architecture

Mobile apps should implement the following offline pattern:

1. **Cache Frequently Used Data**
   ```typescript
   // Cache pricing data on first app launch
   const trades = await api.getPricingTrades();
   await db.saveTrades(trades);
   ```

2. **Queue Offline Requests**
   ```typescript
   // If network unavailable, queue the request
   if (!navigator.onLine) {
     await offlineQueue.add({
       method: 'POST',
       endpoint: '/quotes',
       body: quoteData,
     });
   }
   ```

3. **Sync When Online**
   ```typescript
   // When network restored
   const queued = await offlineQueue.getAll();
   for (const item of queued) {
     try {
       await api[item.method.toLowerCase()](item.endpoint, item.body);
       await offlineQueue.remove(item.id);
     } catch (error) {
       // Retry logic
     }
   }
   ```

---

## Rate Limiting

*Future: To be implemented*

Current: No rate limiting (development).

Recommended: 100 requests per minute per user.

---

## Versioning

API version is included in URL path: `/api/mobile/v1/...`

Current version: `v1` (implicit in `/api/mobile/`)

Breaking changes will create new major version (`v2`, `v3`, etc.)

---

## Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `INVALID_INPUT` | 400 | Missing or invalid parameters |
| `VALIDATION_ERROR` | 400 | Data validation failed (email, VAT, etc.) |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists or state conflict |
| `SERVER_ERROR` | 500 | Internal server error |
| `NETWORK_ERROR` | N/A | Client-side network error |

---

## Support

For issues or questions:
- Email: api-support@buildr.app
- GitHub: github.com/buildr/mobile-api
- Docs: buildr.app/mobile-api-docs

---

## SDK Download

TypeScript SDK available:
```bash
npm install @buildr/mobile-sdk
```

or

```bash
yarn add @buildr/mobile-sdk
```

Exported types from `@buildr/mobile-sdk`:
- `ApiResponse<T>`
- `CalculationRequest`, `CalculationResponse`
- `Document`, `CreateQuoteRequest`, `CreateInvoiceRequest`
- `BusinessProfile`
- `Trade`, `PricingMode`, `Region`
- `OfflineQueueItem`, `SyncResult`
