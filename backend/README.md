# Backend Architecture

This backend follows Controller -> Service -> Repository layering.

- `controllers/`: HTTP orchestration only.
- `services/`: business logic, caching, workflow rules.
- `repositories/`: data persistence via Prisma.
- `middleware/`: auth guard, rate limiting, API guard.
- `utils/`: logger, errors, response envelopes.
