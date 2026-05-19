import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildVintedExtensionCorsHeaders,
  createVintedExtensionCorsOptionsResponse,
  VINTED_AUTO_EXTENSION_ORIGIN,
} from "@/lib/vinted/extension-cors";

describe("Vinted extension CORS", () => {
  it("allows the stable extension origin", () => {
    const headers = buildVintedExtensionCorsHeaders({
      "cache-control": "no-store",
    });

    assert.equal(
      headers.get("access-control-allow-origin"),
      VINTED_AUTO_EXTENSION_ORIGIN
    );
    assert.equal(headers.get("access-control-allow-headers"), "content-type");
    assert.equal(headers.get("cache-control"), "no-store");
  });

  it("returns a preflight response for extension POST callbacks", () => {
    const response = createVintedExtensionCorsOptionsResponse();

    assert.equal(response.status, 204);
    assert.match(
      response.headers.get("access-control-allow-methods") ?? "",
      /POST/
    );
  });
});
