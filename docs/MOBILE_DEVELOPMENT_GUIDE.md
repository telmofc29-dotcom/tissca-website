# BUILDR Mobile App Architecture Guide

**For iOS, Android, and React Native Developers**

---

## Quick Start

### 1. **Understand the Architecture**
```
Web/Admin Layer (React)
        ↓
  Mobile API Endpoints
        ↓
  Shared Services Layer
        ↓
iOS App (React Native) + Android App (React Native)
```

All platforms use **the same calculation and document logic** - zero duplication.

### 2. **Key Principles**

✅ **Single Source of Truth:** All calculation logic in `src/services/calculations.ts`  
✅ **Type-Safe:** Full TypeScript types in `src/services/mobile-types.ts`  
✅ **Offline-First:** Designed for slow/no internet on job sites  
✅ **Platform-Agnostic:** Services work on React, React Native, Node.js  
✅ **Stateless API:** Clients manage their own state (localStorage, SQLite, Realm)  

### 3. **Available Endpoints**

All endpoints at: `https://buildr.app/api/mobile`

| Endpoint | Methods | Purpose |
|----------|---------|---------|
| `/quotes` | POST, GET, PUT | Create, fetch, update quotes |
| `/invoices` | POST, GET, PUT | Create, fetch, update invoices |
| `/profiles` | GET, POST, PUT | Business profile management |
| `/pricing/trades` | GET | List all trades (10 available) |
| `/pricing/modes` | GET | Pricing modes (Budget/Standard/Premium) |
| `/pricing/regions` | GET | UK regions with cost multipliers |
| `/pricing/trade?tradeId=xxx` | GET | Trade details (rates, productivity) |
| `/calculate` | POST | Execute any calculation |

---

## Core Services (Copy to Your Project)

These are the **shared business logic** - copy them to your mobile project:

### 1. Calculations Service
**Location:** `src/services/calculations.ts`

All labour cost calculations for 10 trades:
```typescript
import { calculateAreaBased, calculateKitchen } from '@buildr/shared-services';

const result = calculateAreaBased({
  area: 50,           // square meters
  trade: 'painting',
  mode: 'standard',   // budget, standard, or premium
  difficulty: 'standard',
  region: 'london'
});

console.log(result.estimatedDays);   // 1.43
console.log(result.labourCost);      // £481.13
console.log(result.breakdown);       // { baseRate, multipliers, finalRate }
```

**Supported Trades:**
- Painting, Tiling, Plastering, Flooring
- Kitchen, Bathroom, Wardrobe
- Carpentry, Electrical, Plumbing

### 2. Documents Service
**Location:** `src/services/documents.ts`

Create professional quotes and invoices:
```typescript
import { generateDocument, validateDocument } from '@buildr/shared-services';

const quote = generateDocument('quote', businessInfo, clientInfo, lineItems, vatRate);

// Validates before returning
const validation = validateDocument(quote);
if (!validation.valid) {
  console.error(validation.errors);
}
```

**Returns:**
```typescript
{
  number: 'Q-000001',        // Sequential numbering
  date: '2024-01-18',
  validUntil: '2024-02-17',
  subtotal: 625.00,
  vat: 125.00,
  total: 750.00,
  lineItems: [...]
}
```

### 3. Profiles Service
**Location:** `src/services/profiles.ts`

Manage business information:
```typescript
import {
  createBusinessProfile,
  validateBusinessProfile,
  getNextQuoteNumber
} from '@buildr/shared-services';

// First time setup
const profile = createBusinessProfile({
  name: 'ABC Builders',
  email: 'contact@abc.com',
  defaultPricingMode: 'standard',
  defaultRegion: 'london'
});

// Get next quote number
const nextNum = getNextQuoteNumber(profile); // 'Q-000043'
```

---

## Mobile Type Definitions

Import from: `src/services/mobile-types.ts`

### CalculationRequest
```typescript
interface CalculationRequest {
  type: 'area-based' | 'kitchen' | 'bathroom' | 'wardrobe';
  input: {
    area?: number;
    trade: string;
    mode: 'budget' | 'standard' | 'premium';
    difficulty?: 'easy' | 'standard' | 'hard';
    region?: string;
  };
}
```

### Document
```typescript
interface Document {
  number: string;           // Q-000001 or INV-000001
  type: 'quote' | 'invoice';
  date: string;             // ISO date
  business: BusinessInfo;
  client: ClientInfo;
  lineItems: LineItem[];
  subtotal: number;
  vat: number;
  total: number;
  status?: 'draft' | 'sent' | 'paid';
}
```

### BusinessProfile
```typescript
interface BusinessProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postcode: string;
  vatNumber?: string;
  defaultPricingMode: 'budget' | 'standard' | 'premium';
  defaultRegion: string;
  nextQuoteNumber: number;
  nextInvoiceNumber: number;
}
```

---

## Offline-First Architecture

Mobile apps must work **without internet** on job sites.

### 1. Cache Pricing Data
```typescript
// On app startup
const trades = await api.get('/api/mobile/pricing/trades');
const modes = await api.get('/api/mobile/pricing/modes');
const regions = await api.get('/api/mobile/pricing/regions');

// Save to local database
await db.saveTrades(trades);
await db.saveModes(modes);
await db.saveRegions(regions);

// Use locally
const cachedTrades = await db.getTrades();
```

### 2. Queue Offline Requests
```typescript
interface OfflineQueueItem {
  id: string;
  timestamp: number;
  method: 'POST' | 'PUT';
  endpoint: string;        // '/api/mobile/quotes'
  body: Record<string, any>;
  retryCount: number;
  lastError?: string;
}

// When offline:
if (!navigator.onLine) {
  await offlineQueue.add({
    method: 'POST',
    endpoint: '/api/mobile/quotes',
    body: quoteData,
  });
}
```

### 3. Sync When Online
```typescript
// Listen for network status
addEventListener('online', async () => {
  const queued = await offlineQueue.getAll();
  
  for (const item of queued) {
    try {
      const response = await api[item.method.toLowerCase()](
        item.endpoint,
        item.body
      );
      await offlineQueue.remove(item.id);
    } catch (error) {
      item.retryCount++;
      if (item.retryCount > 3) {
        // Show error to user
        console.error(`Failed to sync: ${item.id}`);
      }
    }
  }
});
```

---

## iOS Implementation (Swift)

### Network Layer
```swift
import Foundation

class BUILDRAPI {
    private let baseURL = "https://buildr.app/api/mobile"
    
    func calculate(type: String, input: [String: Any]) async throws -> CalculationResult {
        var request = URLRequest(url: URL(string: "\(baseURL)/calculate")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(
            withJSONObject: ["type": type, "input": input]
        )
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(ApiResponse<CalculationResult>.self, from: data)
        return response.data!
    }
}
```

### Local Storage (Core Data or SQLite)
```swift
// Store pricing data locally
let tradeData = try Data(contentsOf: localURL)
let trades = try JSONDecoder().decode([Trade].self, from: tradeData)

// Store draft quotes
let quote = Quote(...)
try context.save()  // Core Data

// Queue offline requests
let queuedRequest = OfflineQueueItem(
    method: "POST",
    endpoint: "/api/mobile/quotes",
    body: quoteData
)
offlineQueue.append(queuedRequest)
```

---

## Android Implementation (Kotlin)

### Retrofit Client
```kotlin
import retrofit2.http.*

interface BUILDRMobileAPI {
    @POST("/calculate")
    suspend fun calculate(@Body request: CalculationRequest): ApiResponse<CalculationResponse>
    
    @POST("/quotes")
    suspend fun createQuote(@Body request: CreateQuoteRequest): ApiResponse<Document>
    
    @GET("/profiles")
    suspend fun getProfile(@Query("userId") userId: String): ApiResponse<BusinessProfile>
    
    @GET("/pricing/trades")
    suspend fun getPricingTrades(): ApiResponse<List<Trade>>
}

val retrofit = Retrofit.Builder()
    .baseUrl("https://buildr.app/api/mobile")
    .addConverterFactory(GsonConverterFactory.create())
    .build()

val api = retrofit.create(BUILDRMobileAPI::class.java)
```

### Room Database (SQLite)
```kotlin
@Entity(tableName = "quotes")
data class QuoteEntity(
    @PrimaryKey val number: String,
    val date: String,
    val total: Double,
    val status: String,  // draft, sent, paid
    val syncedAt: Long?  // null = not synced
)

@Dao
interface QuoteDao {
    @Insert
    suspend fun insert(quote: QuoteEntity)
    
    @Query("SELECT * FROM quotes WHERE syncedAt IS NULL")
    suspend fun getUnsynced(): List<QuoteEntity>
}
```

---

## React Native Implementation (TypeScript)

### API Client
```typescript
import { createClient } from '@buildr/mobile-sdk';

const client = createClient({
  baseURL: 'https://buildr.app/api/mobile',
  userId: 'user-123'
});

// Use shared types
const result = await client.post<CreateQuoteResponse>(
  '/quotes',
  {
    businessInfo,
    clientInfo,
    lineItems,
    vatRate: 20
  }
);
```

### Async Storage (Offline)
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache pricing data
const cachePricingData = async () => {
  const trades = await client.get('/pricing/trades');
  await AsyncStorage.setItem('trades', JSON.stringify(trades));
};

// Queue offline requests
const queueRequest = async (method: string, endpoint: string, body: any) => {
  const queued = await AsyncStorage.getItem('offlineQueue');
  const queue = queued ? JSON.parse(queued) : [];
  
  queue.push({
    id: generateId(),
    timestamp: Date.now(),
    method,
    endpoint,
    body,
    retryCount: 0
  });
  
  await AsyncStorage.setItem('offlineQueue', JSON.stringify(queue));
};
```

---

## Feature Implementation Checklist

### Minimum Viable Product (MVP)
- [ ] Display list of trades with rates
- [ ] Calculate labour costs (area-based)
- [ ] Create and save draft quotes locally
- [ ] Display saved quotes
- [ ] Sync quotes when online
- [ ] View pricing breakdown (region, difficulty multipliers)
- [ ] Basic profile setup (name, email, phone)

### Phase 2
- [ ] Kitchen, bathroom, wardrobe calculations
- [ ] Invoice generation
- [ ] PDF export of quotes/invoices
- [ ] Client management
- [ ] Edit/delete saved documents
- [ ] Multiple profiles support
- [ ] Export to email/share

### Phase 3
- [ ] Dark mode support
- [ ] Multiple languages
- [ ] Cloud sync (optional - can use API for data storage)
- [ ] Payment tracking
- [ ] Analytics dashboard
- [ ] Team collaboration

---

## Testing Strategy

### Unit Tests
```typescript
// Test calculation logic
describe('Calculations', () => {
  it('calculates area-based correctly', () => {
    const result = calculateAreaBased({
      area: 50,
      trade: 'painting',
      mode: 'standard',
      difficulty: 'standard',
      region: 'london'
    });
    
    expect(result.estimatedDays).toBeCloseTo(1.43, 1);
    expect(result.labourCost).toBeGreaterThan(400);
  });
});
```

### Integration Tests
```typescript
// Test API endpoints
describe('Mobile API', () => {
  it('creates quote successfully', async () => {
    const quote = await api.post('/quotes', {
      businessInfo,
      clientInfo,
      lineItems
    });
    
    expect(quote.number).toMatch(/^Q-\d+$/);
    expect(quote.total).toBeGreaterThan(0);
  });
});
```

### Offline Tests
```typescript
// Test offline queue
describe('Offline Sync', () => {
  it('queues requests when offline', async () => {
    // Simulate offline
    navigator.onLine = false;
    
    await api.post('/quotes', {...});
    
    const queued = await offlineQueue.getAll();
    expect(queued.length).toBe(1);
  });
  
  it('syncs when online', async () => {
    // Simulate going online
    navigator.onLine = true;
    dispatchEvent(new Event('online'));
    
    // Wait for sync
    await waitFor(() => {
      expect(offlineQueue.getAll()).resolves.toHaveLength(0);
    });
  });
});
```

---

## Deployment & Distribution

### iOS
1. Register as Apple Developer
2. Create TestFlight build
3. Submit to App Store
4. Use CI/CD (GitHub Actions, fastlane)

### Android
1. Create Google Play Console account
2. Build signed APK/AAB
3. Submit to Google Play Store
4. Use CI/CD (GitHub Actions, Gradle)

### Web
1. Already deployed at `https://buildr.app`
2. API endpoints ready for mobile
3. Shared services available

---

## Support & Documentation

- **Full API Docs:** [docs/MOBILE_API.md](docs/MOBILE_API.md)
- **Type Definitions:** [src/services/mobile-types.ts](src/services/mobile-types.ts)
- **Shared Services:** [src/services/](src/services/)
- **Example Projects:**
  - iOS (Swift): [buildr-ios-example](https://github.com/buildr/buildr-ios-example)
  - Android (Kotlin): [buildr-android-example](https://github.com/buildr/buildr-android-example)
  - React Native: [buildr-rn-example](https://github.com/buildr/buildr-rn-example)

---

## Common Issues & Solutions

### Q: How do I use the shared services?
**A:** Copy `src/services/*.ts` to your mobile project or import as npm package.

### Q: Can I modify calculation logic?
**A:** No - modify in `src/services/calculations.ts` and all platforms get the update.

### Q: What about authentication?
**A:** API is stateless - in production, add JWT tokens to request headers.

### Q: How do I handle offline documents?
**A:** Use OfflineQueueItem type - we provide conflict resolution guidance in docs.

### Q: Can I customize document numbering?
**A:** Yes - modify `nextQuoteNumber` and `nextInvoiceNumber` in BusinessProfile.

---

**Happy building! 🏗️**

For questions: api-support@buildr.app
