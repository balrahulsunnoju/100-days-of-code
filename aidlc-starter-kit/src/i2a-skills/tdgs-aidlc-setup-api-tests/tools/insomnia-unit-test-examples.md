# Insomnia Unit Test Syntax (Collection Authoring)

Use Insomnia's test API — NOT Postman's `pm.*` scripting.

## Correct

```javascript
const resp = await insomnia.send();
expect(resp.status).to.equal(200);

const body = JSON.parse(resp.data);
expect(body).to.have.property('id');
expect(resp.headers['content-type']).to.contain('application/json');
```

## Wrong (Postman — will NOT work with inso CLI)

```javascript
pm.test("Status code is 200", function() {
  pm.response.to.have.status(200);
});
```

Every `unit_test` resource must reference a `requestId`, call `await insomnia.send()`, and use chai `expect()` assertions.
