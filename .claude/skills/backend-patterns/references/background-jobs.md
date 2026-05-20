# Background Jobs & Event-Driven Architecture

Comprehensive patterns for asynchronous processing and event-driven systems.

---

## Job Queue Pattern

```typescript
interface Job {
  id: string;
  type: string;
  data: any;
  attempts: number;
  maxAttempts: number;
}

class JobQueue {
  async enqueue(type: string, data: any): Promise<Job> {
    const job = {
      id: generateId(),
      type,
      data,
      attempts: 0,
      maxAttempts: 3
    };

    await redis.lpush('jobs', JSON.stringify(job));
    return job;
  }

  async process() {
    while (true) {
      const jobStr = await redis.brpop('jobs', 0);
      const job = JSON.parse(jobStr);

      try {
        await this.handlers[job.type](job.data);
      } catch (error) {
        job.attempts++;
        if (job.attempts < job.maxAttempts) {
          await redis.lpush('jobs', JSON.stringify(job));
        }
      }
    }
  }
}
```

**When to use:**
- Long-running tasks (email sending, image processing)
- Tasks that can be retried
- Tasks that should run asynchronously

## Event-Driven Architecture

```typescript
interface Event {
  type: string;
  data: any;
  timestamp: number;
}

class EventBus {
  async publish(event: Event): Promise<void> {
    await kafka.send({
      topic: event.type,
      messages: [{ value: JSON.stringify(event) }]
    });
  }

  async subscribe(eventType: string, handler: (event: Event) => void): Promise<void> {
    await kafka.subscribe({ topic: eventType });
    await kafka.run({
      eachMessage: async ({ message }) => {
        const event = JSON.parse(message.value.toString());
        await handler(event);
      }
    });
  }
}
```

**When to use:**
- Microservices communication
- Decoupled systems
- Real-time data processing
- Event sourcing

---

## Resources

- Background Jobs: https://github.com/OptimalBits/bull
- Event-Driven Architecture: https://microservices.io/patterns/data/event-driven-architecture.html
