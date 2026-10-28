import test from "node:test";
import assert from "node:assert/strict";
import { newer, macDownload } from "../electron/versions.mjs";

test("only a strictly newer x.y.z version counts as an update", () => {
  assert.equal(newer("0.3.3", "0.3.2"), true);
  assert.equal(newer("0.4.0", "0.3.9"), true);
  assert.equal(newer("1.0.0", "0.9.9"), true);
  assert.equal(newer("0.3.2", "0.3.2"), false);
  assert.equal(newer("0.3.1", "0.3.2"), false);
  assert.equal(newer("0.10.0", "0.9.0"), true);
  assert.equal(newer("", "0.3.2"), false);
  assert.equal(newer("0.3", "0.3.2"), false);
  assert.equal(newer("0.3.x", "0.3.2"), false);
});

test("the Mac download matches the chip and uses the fixed latest-release link", () => {
  assert.equal(macDownload("arm64"), "https://github.com/Mathpcastro/pacto-releases/releases/latest/download/Carrossell-Mac-AppleSilicon.dmg");
  assert.equal(macDownload("x64"), "https://github.com/Mathpcastro/pacto-releases/releases/latest/download/Carrossell-Mac-Intel.dmg");
  assert.equal(macDownload("arm64", "http://127.0.0.1:9/"), "http://127.0.0.1:9/Carrossell-Mac-AppleSilicon.dmg");
});
