import test from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";
import { ProfileMenu, googlePictureUrl } from "../src/DameDast.Web/wwwroot/profile-menu.js";

function fixture(t) {
  const { document, window } = parseHTML('<html><body><div><button id="profile"><span class="avatar"><svg></svg></span><span id="profile-name"></span></button><div id="menu" hidden></div></div></body></html>');
  const previous = globalThis.document;
  globalThis.document = document;
  t.after(() => { globalThis.document = previous; });
  return { document, window, button: document.querySelector("#profile"), profile: new ProfileMenu(document.querySelector("#profile"), document.querySelector("#menu")) };
}
const alice = { authenticated: true, userId: "alice", name: 'Alice <script>bad</script>', pictureUrl: "https://lh3.googleusercontent.com/a/avatar" };

test("Google name and lazy remote photo render without replacing or reloading the image on unrelated renders", t => {
  const f = fixture(t);
  f.profile.render(alice, "google:alice");
  const img = f.button.querySelector("img");
  assert.equal(img.src, alice.pictureUrl);
  assert.equal(img.loading, "lazy");
  assert.equal(img.decoding, "async");
  assert.equal(img.referrerPolicy, "no-referrer");
  assert.equal(f.button.querySelector("bdi").textContent, alice.name);
  assert.equal(f.button.querySelector("script"), null);
  img.dispatchEvent(new f.window.Event("load"));
  assert.equal(img.classList.contains("is-loaded"), true);
  f.profile.render(alice, "demo");
  assert.equal(f.button.querySelector("img"), img);
  assert.equal(f.button.querySelector("bdi").textContent, alice.name);
});

test("broken pictures fall back without a retry loop; switching accounts and signing out clear the old picture and name", t => {
  const f = fixture(t);
  f.profile.render(alice, "google:alice");
  const img = f.button.querySelector("img");
  img.dispatchEvent(new f.window.Event("error"));
  assert.equal(f.button.querySelector("img"), null);
  assert.ok(f.button.querySelector("svg"));
  f.profile.render(alice, "google:alice");
  assert.equal(f.button.querySelector("img"), null);
  f.profile.render({ ...alice, userId: "bob", name: "Bob" }, "google:bob");
  assert.ok(f.button.querySelector("img"));
  f.profile.render({ authenticated: false, name: "stale", pictureUrl: alice.pictureUrl });
  assert.equal(f.button.querySelector("img"), null);
  assert.notEqual(f.button.querySelector("bdi").textContent, "Bob");
  assert.notEqual(f.button.querySelector("bdi").textContent, "stale");
});

test("only HTTPS Google image URLs are accepted", () => {
  assert.equal(googlePictureUrl(alice.pictureUrl), alice.pictureUrl);
  for (const url of [null, "javascript:alert(1)", "data:image/svg+xml,x", "http://lh3.googleusercontent.com/x", "https://lh3.googleusercontent.com.evil.test/x", "https://evil.test/x", "https://user:pass@lh3.googleusercontent.com/x", "https://lh3.googleusercontent.com:8443/x"])
    assert.equal(googlePictureUrl(url), null);
});
