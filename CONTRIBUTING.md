# Contributing

## Coding standards

- Use Java 17 and the existing package structure. Keep servlet handlers focused on HTTP/session work, put persistence in DAOs, and extract database-independent rules into services.
- Use `UpperCamelCase` for Java types, `lowerCamelCase` for fields and methods, and descriptive names for tests.
- Add class-level Javadoc describing purpose, callers, and important design decisions. Document public/protected APIs and add concise rationale comments only for non-obvious behavior.
- Use `PreparedStatement` for all SQL, close JDBC resources with try-with-resources, and use transactions when one operation changes multiple related rows.
- Obtain user ownership from the authenticated session. Never authorize a request using a user ID supplied by the client.
- Preserve existing HTTP routes, status codes, and JSON shapes unless a change is intentionally documented and tested.

## Tests and validation

- Write one-behavior-per-test JUnit 5 cases with descriptive method names.
- Keep unit tests independent of a live MySQL server; extract pure logic or inject narrow interfaces when database code otherwise prevents isolated testing.
- Run `mvn -f backend\pom.xml clean test` after backend changes. For frontend changes, run `npm run lint` and `npm run build`.
- Add regression coverage for behavior changes and update the README when setup or validation commands change.

## Branches and commits

- Create focused branches using `feature/<short-description>`, `fix/<short-description>`, or `docs/<short-description>`.
- Use concise imperative commit subjects, for example `Add persistent habit tracking`.
- Keep each commit focused on one logical change and avoid committing generated output, local databases, `.env` files, credentials, or personal screenshots.

