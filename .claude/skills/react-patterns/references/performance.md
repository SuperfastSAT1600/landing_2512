# Performance Optimization - Detailed Examples

## Memoization

### React.memo - Prevent unnecessary re-renders
```tsx
const ExpensiveList = memo(function ExpensiveList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
});
```

### useMemo - Memoize expensive calculations
```tsx
function DataTable({ data, filter }: DataTableProps) {
  const filteredData = useMemo(() => {
    return data.filter(item => item.name.includes(filter));
  }, [data, filter]);

  return <Table data={filteredData} />;
}
```

### useCallback - Memoize callbacks
```tsx
function ParentComponent() {
  const [count, setCount] = useState(0);

  const handleClick = useCallback(() => {
    setCount(c => c + 1);
  }, []);

  return <ChildComponent onClick={handleClick} />;
}
```

## Code Splitting

### Lazy loading components
```tsx
const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### Route-based splitting
```tsx
const routes = [
  {
    path: '/dashboard',
    element: lazy(() => import('./pages/Dashboard')),
  },
  {
    path: '/settings',
    element: lazy(() => import('./pages/Settings')),
  },
];
```

## Virtual Lists

### Using react-window for large lists
```tsx
import { FixedSizeList } from 'react-window';

function VirtualizedList({ items }: { items: Item[] }) {
  const Row = ({ index, style }: { index: number; style: CSSProperties }) => (
    <div style={style}>{items[index].name}</div>
  );

  return (
    <FixedSizeList
      height={400}
      width="100%"
      itemCount={items.length}
      itemSize={35}
    >
      {Row}
    </FixedSizeList>
  );
}
```
