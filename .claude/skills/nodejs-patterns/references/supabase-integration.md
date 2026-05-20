# Supabase Integration Examples

Complete implementation examples for integrating Supabase with Node.js backend.

---

## Supabase Client Setup

### Server-Side Client Configuration
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Server-side client with service role key (bypasses RLS)
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// For client-specific requests with RLS
export const createUserClient = (accessToken: string) => {
  return createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY!, {
    global: {
      headers: {
        Authorization: "Bearer " + accessToken,
      },
    },
  });
};
```

---

## Service Role vs Anon Key

### When to Use Service Role Key
- **Server-side operations** that bypass Row Level Security (RLS)
- **Admin operations** requiring elevated permissions
- **Background jobs** and cron tasks
- **Internal API calls** between services

```typescript
// Use service role client for admin operations
export const adminService = {
  async getAllUsers() {
    const { data, error } = await supabase
      .from('users')
      .select('*'); // Bypasses RLS

    if (error) throw error;
    return data;
  }
};
```

### When to Use Anon Key with User Token
- **User-specific operations** that respect RLS policies
- **API endpoints** that should enforce user permissions
- **Multi-tenant data access** based on authenticated user

```typescript
// Use user-scoped client for user operations
export const getUserData = async (accessToken: string, userId: string) => {
  const userClient = createUserClient(accessToken);

  const { data, error } = await userClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single(); // Will respect RLS policies

  if (error) throw error;
  return data;
};
```

---

## Common Patterns

### Pagination
```typescript
export class UserService {
  async findAll(options?: { page?: number; perPage?: number }) {
    const page = options?.page || 1;
    const perPage = options?.perPage || 20;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    const [{ data: users, error: usersError }, { count, error: countError }] = await Promise.all([
      supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to),
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true }),
    ]);

    if (usersError) throw usersError;
    if (countError) throw countError;

    return { users: users || [], total: count || 0, page, perPage };
  }
}
```

### Transaction-like Operations
```typescript
// Supabase doesn't support traditional transactions in JS client
// Use database functions or edge functions for atomic operations

export class OrderService {
  async createOrder(userId: string, items: OrderItem[]) {
    // Call a Postgres function that handles transaction
    const { data, error } = await supabase
      .rpc('create_order_with_items', {
        user_id: userId,
        order_items: items
      });

    if (error) throw error;
    return data;
  }
}
```

### Error Handling
```typescript
export class ProductService {
  async findById(id: string) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    // Handle specific Supabase errors
    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError('Product', id);
      }
      throw error;
    }

    return data;
  }
}
```

### Real-time Subscriptions
```typescript
// src/services/realtimeService.ts
import { supabase } from '../lib/supabase';

export class RealtimeService {
  subscribeToOrders(userId: string, callback: (order: Order) => void) {
    return supabase
      .channel('orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: "user_id=eq." + userId,
        },
        (payload) => {
          callback(payload.new as Order);
        }
      )
      .subscribe();
  }
}
```

### Storage Operations
```typescript
export class FileService {
  async uploadAvatar(userId: string, file: File) {
    const fileName = userId + "/" + Date.now() + "-" + file.name;

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    return publicUrl;
  }

  async deleteAvatar(filePath: string) {
    const { error } = await supabase.storage
      .from('avatars')
      .remove([filePath]);

    if (error) throw error;
  }
}
```

---

## Best Practices

1. **Use service role key** for server-side operations that need admin access
2. **Use anon key + user token** for user-scoped operations respecting RLS
3. **Handle errors properly**: Check for specific error codes
4. **Use database functions** for complex transactions
5. **Implement pagination** for large datasets
6. **Leverage real-time** for live updates where needed
7. **Use storage API** for file uploads with proper access controls
8. **Never expose service role key** to client-side code
