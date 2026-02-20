---
name: new-component
description: Scaffold a new React component with tests, stories, and proper structure
---

# New Component Command

Quickly scaffold a new React component with tests, Storybook stories, and proper TypeScript typing.

---

## Purpose

Create consistent, well-structured components with all necessary files and boilerplate.

---

## When to Use

- Creating new UI components
- Starting a new feature component
- Need consistent component structure
- Want automatic test and story generation

---

## What It Does

1. **Creates component file** with TypeScript and proper structure
2. **Generates test file** with basic test cases
3. **Creates Storybook story** (if Storybook is detected)
4. **Adds to barrel export** (index.ts)
5. **Applies project conventions** from templates

---

## Usage

```bash
/new-component <ComponentName> [options]

Options:
  --type=<type>        Component type: ui, feature, layout (default: ui)
  --path=<path>        Custom path (default: based on type)
  --no-test           Skip test file generation
  --no-story          Skip Storybook story generation
```

---

## Examples

### Example 1: Simple UI Component
```bash
/new-component Button

Creates:
src/components/ui/Button/
├── Button.tsx
├── Button.test.tsx
├── Button.stories.tsx
└── index.ts
```

**Button.tsx**:
```typescript
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading = false, className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'rounded font-medium transition-colors',
          {
            'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
            'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
            'border border-gray-300 hover:bg-gray-50': variant === 'outline',
            'px-2 py-1 text-sm': size === 'sm',
            'px-4 py-2': size === 'md',
            'px-6 py-3 text-lg': size === 'lg',
            'opacity-50 cursor-not-allowed': isLoading,
          },
          className
        )}
        disabled={isLoading || props.disabled}
        {...props}
      >
        {isLoading ? 'Loading...' : children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

**Button.test.tsx**:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies variant styles', () => {
    render(<Button variant="secondary">Button</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-gray-200');
  });

  it('is disabled when loading', () => {
    render(<Button isLoading>Button</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

**Button.stories.tsx**:
```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
};

export const Outline: Story = {
  args: {
    children: 'Outline Button',
    variant: 'outline',
  },
};

export const Loading: Story = {
  args: {
    children: 'Loading Button',
    isLoading: true,
  },
};

export const Small: Story = {
  args: {
    children: 'Small Button',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    children: 'Large Button',
    size: 'lg',
  },
};
```

---

### Example 2: Feature Component
```bash
/new-component UserProfile --type=feature

Creates:
src/features/user/components/UserProfile/
├── UserProfile.tsx
├── UserProfile.test.tsx
├── UserProfile.stories.tsx
└── index.ts
```

**UserProfile.tsx**:
```typescript
'use client';

import { useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

export interface UserProfileProps {
  userId: string;
}

export function UserProfile({ userId }: UserProfileProps) {
  const { user, isLoading, error } = useUser(userId);
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!user) {
    return <div>User not found</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Avatar src={user.avatar} alt={user.name} size="lg" />
        <div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="text-gray-600">{user.email}</p>
        </div>
      </div>

      {isEditing ? (
        <div>
          {/* Edit form */}
          <Button onClick={() => setIsEditing(false)}>Cancel</Button>
        </div>
      ) : (
        <div>
          {/* Display mode */}
          <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
        </div>
      )}
    </div>
  );
}
```

---

### Example 3: Layout Component
```bash
/new-component DashboardLayout --type=layout

Creates:
src/components/layout/DashboardLayout/
├── DashboardLayout.tsx
├── DashboardLayout.test.tsx
└── index.ts
```

---

## Component Types

### UI Components (`--type=ui`)
- Location: `src/components/ui/`
- Purpose: Reusable, generic UI elements
- Examples: Button, Input, Card, Modal
- No business logic

### Feature Components (`--type=feature`)
- Location: `src/features/[domain]/components/`
- Purpose: Feature-specific components
- Examples: UserProfile, PostEditor, CheckoutForm
- Contains business logic

### Layout Components (`--type=layout`)
- Location: `src/components/layout/`
- Purpose: Page layouts and shells
- Examples: DashboardLayout, AuthLayout, MainLayout
- Wraps page content

---

## Customization

### Use Project Templates
The command uses templates from `.claude/templates/`:
- `component.tsx.template` - Standard React components
- `form.tsx.template` - Form components with React Hook Form + Zod
- `hook.ts.template` - Custom React hooks
- `test.spec.ts.template` - Test file generation

If `.claude/templates/component.tsx.template` exists, the command uses it:

```typescript
// .claude/templates/component.tsx.template
/**
 * {{COMPONENT_NAME}} Component
 *
 * {{COMPONENT_DESCRIPTION}}
 */

import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface {{COMPONENT_NAME}}Props extends HTMLAttributes<HTMLDivElement> {
  // Add props here
}

export function {{COMPONENT_NAME}}({ className, ...props }: {{COMPONENT_NAME}}Props) {
  return (
    <div className={cn('', className)} {...props}>
      {/* Component content */}
    </div>
  );
}
```

---

## Generated Files Checklist

- [ ] Component file (`.tsx`)
- [ ] TypeScript interface for props
- [ ] forwardRef for DOM components
- [ ] className prop with cn() utility
- [ ] Test file with basic tests
- [ ] Storybook story with variants
- [ ] Barrel export (index.ts)
- [ ] Added to parent index if applicable

---

## Component Patterns

### 1. Compound Components
```typescript
export function Card({ children, className }: CardProps) {
  return <div className={cn('rounded border', className)}>{children}</div>;
}

Card.Header = function CardHeader({ children, className }: CardHeaderProps) {
  return <div className={cn('p-4 border-b', className)}>{children}</div>;
};

Card.Body = function CardBody({ children, className }: CardBodyProps) {
  return <div className={cn('p-4', className)}>{children}</div>;
};

Card.Footer = function CardFooter({ children, className }: CardFooterProps) {
  return <div className={cn('p-4 border-t', className)}>{children}</div>;
};

// Usage
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>
```

### 2. Controlled Component
```typescript
interface InputProps {
  value: string;
  onChange: (value: string) => void;
}

export function Input({ value, onChange, ...props }: InputProps) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  );
}
```

### 3. Render Props
```typescript
interface DataProviderProps<T> {
  data: T[];
  render: (data: T[]) => React.ReactNode;
}

export function DataProvider<T>({ data, render }: DataProviderProps<T>) {
  return <>{render(data)}</>;
}

// Usage
<DataProvider data={users} render={(users) => (
  <ul>
    {users.map(user => <li key={user.id}>{user.name}</li>)}
  </ul>
)} />
```

---

## Best Practices Applied

- ✅ TypeScript with proper typing
- ✅ forwardRef for DOM components
- ✅ Compound components for complex UI
- ✅ className prop for styling flexibility
- ✅ Accessibility attributes
- ✅ Test coverage
- ✅ Storybook documentation
- ✅ Consistent naming conventions

---

## Post-Generation Steps

After component creation:

1. **Customize props** based on requirements
2. **Add business logic** if needed
3. **Style component** with Tailwind/CSS
4. **Add more test cases** for edge cases
5. **Add Storybook variants** for all states
6. **Update documentation** if needed

---

## Integration with Other Commands

```bash
# Create component, then test it
/new-component Button
/tdd # Write tests first, then implement

# Create component, then review it
/new-component UserCard
/review-changes # Review generated code
```
