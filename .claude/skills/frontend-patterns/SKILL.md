---
name: frontend-patterns
description: Provides React patterns, component design, state management, and UI best practices for building modern frontend applications.
---

# Frontend Patterns

React, component design, state management, and UI best practices.

---

## React Component Patterns

### Functional Components
```typescript
interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
}

export function UserCard({ user, onEdit }: UserCardProps) {
  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
      {onEdit && (
        <button onClick={() => onEdit(user)}>Edit</button>
      )}
    </div>
  );
}
```

### Custom Hooks
```typescript
function useAsync<T>(asyncFn: () => Promise<T>) {
  const [state, setState] = useState<{
    data?: T;
    error?: Error;
    loading: boolean;
  }>({ loading: true });

  useEffect(() => {
    let cancelled = false;

    asyncFn()
      .then(data => !cancelled && setState({ data, loading: false }))
      .catch(error => !cancelled && setState({ error, loading: false }));

    return () => { cancelled = true; };
  }, []);

  return state;
}
```

### Compound Components
```typescript
function Select({ children, value, onChange }) {
  return (
    <SelectContext.Provider value={{ value, onChange }}>
      <div className="select">{children}</div>
    </SelectContext.Provider>
  );
}

Select.Option = function Option({ value, children }) {
  const { value: selectedValue, onChange } = useContext(SelectContext);
  return (
    <div
      className={value === selectedValue ? 'selected' : ''}
      onClick={() => onChange(value)}
    >
      {children}
    </div>
  );
};

// Usage
<Select value={selected} onChange={setSelected}>
  <Select.Option value="a">Option A</Select.Option>
  <Select.Option value="b">Option B</Select.Option>
</Select>
```

---

## State Management

### Context + Reducer
```typescript
const UserContext = createContext<UserState | null>(null);

function userReducer(state: UserState, action: UserAction): UserState {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, user: action.payload, isAuthenticated: true };
    case 'LOGOUT':
      return { ...state, user: null, isAuthenticated: false };
    default:
      return state;
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(userReducer, initialState);

  return (
    <UserContext.Provider value={{ state, dispatch }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) throw new Error('useUser must be used within UserProvider');
  return context;
}
```

---

## Performance Optimization

### Memoization
```typescript
// Memo component
const ExpensiveComponent = memo(function ExpensiveComponent({ data }) {
  return <div>{/* Heavy rendering */}</div>;
});

// useMemo for values
const sortedData = useMemo(
  () => data.sort((a, b) => a.value - b.value),
  [data]
);

// useCallback for functions
const handleClick = useCallback(
  () => onItemClick(item.id),
  [item.id, onItemClick]
);
```

### Code Splitting
```typescript
// Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}
```

---

## Form Handling

### Controlled Components
```typescript
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const errors = validate({ email, password });
    if (Object.keys(errors).length > 0) {
      setErrors(errors);
      return;
    }

    await login({ email, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
      />
      {errors.email && <span className="error">{errors.email}</span>}
    </form>
  );
}
```

---

## API Integration

### SWR Pattern
```typescript
function useUser(id: string) {
  const { data, error, mutate } = useSWR("/api/users/" + id, fetcher);

  return {
    user: data,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate
  };
}
```

---

## Accessibility

```typescript
// Semantic HTML
<button onClick={handleClick}>Click me</button>

// ARIA labels
<button aria-label="Close dialog" onClick={onClose}>
  <CloseIcon />
</button>

// Keyboard navigation
<div
  role="button"
  tabIndex={0}
  onKeyDown={e => e.key === 'Enter' && onClick()}
  onClick={onClick}
>
  Clickable div
</div>
```

---

## Resources

- React Patterns: https://react-patterns.com/
- React Performance: https://react.dev/learn/render-and-commit
