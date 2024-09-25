# Routing Component

Routing inspired by ASP.NET primarily.

Features:
- Parse support three components: text, param and catch-all;
- Two param syntax supported: `:param[=constaint[[(...args)[;]][;]` (express and angular) and `{param[=constraint()]}"`
### Colon style => :param
```text
/
/api
/api/:version
/api/:term;ess // semi-colon breaks param name run. /api/actress works, otherwise "termess" is param name
/api/:_majorVersion=number // "number" is a constraint
/api/**the_rest // catch all
```
### Curly bracket style => {param}
```text
/
/api
/api/{version}
/api/{term}ess // semi-colon breaks param name run. /api/actress works, otherwise "termess" is param name
/api/{_majorVersion:number} // "number" is a constraint
/api/{**rightUrl} // catch all
```

## Constraints

ASP.NET inspired feature. Any route parameter can be validated on router level.

- `number` - JS compatible number, could be decimal or whole. e.g. `1`, `2.3`, `-42` etc.
- `digit` - `[0-9]+` .
- `alpha` - `[a-zA-Z]+`.
- `alphanumeric` - `[a-zA-Z0-9]+`.
- `uuid` - `XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX` where `X=[0-9A-Fa-f]`.
- `minlength(value)` - validates min length of testing string.
- `maxlength(value)` - validates max length of testing string.
- `length(value) || length(min, max)` - set length for testing string.
- `min(value)` - set min value for testing number (converted from string).
- `max(value)` - set max value for testing number (converted from string).
- `range(min, max)` - set value range for testing number (converted from string).
- `regexp(pattern)` - uses `RegExp` for validation. e.g. `:zero_run=regexp(^[0]+$);`.

## RouteSet to build

```typescript
import { RouteSet } from 'fiorite';

const routes = new RouteSet();
routes.map('/foo', () => 'foo');
routes.map('get', '/foo2', () => 'foo2'); 
routes.mapGet('/foo3', () => 'foo3');
routes.mapProject(); // read 
```

## Decorators

### Class `@Controller(routePrefix?: string)`

- `@RoutePrefix(path: string)`

### Method `@Route(path: string, method: HttpMethod)`

- `@HttpGet(path?: string)`
- `@HttpHead(path?: string)`
- `@HttpPost(path?: string)`
- `@HttpPut(path?: string)`
- `@HttpDelete(path?: string)`
- `@HttpConnect(path?: string)`
- `@HttpOptions(path?: string)`
- `@HttpTrace(path?: string)`
- `@HttpPatch(path?: string)`

### Parameter `@FromRequest(callback: MapCallback<HttpRequest, unknown>)`

- `@FromParam(key: string)`
- `@FromQuery(key: string)`
- `@FromHeader(key: string)`
- `@FromBody()`
