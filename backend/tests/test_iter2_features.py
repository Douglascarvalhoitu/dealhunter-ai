"""Iteration 2 tests: Price Alerts, Blog Publisher, Feed Import, Change Password,
Site Settings, sitemap/robots. Uses public REACT_APP_BACKEND_URL."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://smart-deal-hub-1.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@dealhunter.ai"
ADMIN_PASSWORD = "DealHunter2026!"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def sample_product():
    r = requests.get(f"{BASE_URL}/api/products?limit=1", timeout=15)
    assert r.status_code == 200
    items = r.json()["items"]
    assert items
    return items[0]


# -------- Price Alerts --------
class TestPriceAlerts:
    def test_create_alert_ok(self, sample_product):
        r = requests.post(f"{BASE_URL}/api/alerts", json={
            "email": "TEST_alert@example.com",
            "product_id": sample_product["id"],
            "target_price": 1.0,  # unlikely to be reached, safe
        }, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        assert "message" in data

    def test_create_alert_unknown_product_404(self):
        r = requests.post(f"{BASE_URL}/api/alerts", json={
            "email": "TEST_alert@example.com",
            "product_id": "nonexistent-id-xyz",
            "target_price": 10.0,
        }, timeout=15)
        assert r.status_code == 404

    def test_admin_list_alerts_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/admin/alerts", timeout=15)
        assert r.status_code == 401

    def test_admin_list_alerts(self, auth_headers, sample_product):
        r = requests.get(f"{BASE_URL}/api/admin/alerts", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list)
        assert any(a["product_id"] == sample_product["id"] for a in arr)

    def test_check_triggers(self, auth_headers, sample_product):
        # Create alert with target >= current price to trigger
        target = float(sample_product["price"]) + 100
        requests.post(f"{BASE_URL}/api/alerts", json={
            "email": "TEST_trigger@example.com",
            "product_id": sample_product["id"],
            "target_price": target,
        }, timeout=15)
        r = requests.post(f"{BASE_URL}/api/admin/alerts/check", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "triggered_count" in data and "triggered" in data
        assert data["triggered_count"] >= 1


# -------- Blog Publishing --------
class TestBlog:
    @pytest.fixture(scope="class")
    def draft(self, auth_headers, sample_product):
        r = requests.post(f"{BASE_URL}/api/admin/ai/content", headers=auth_headers,
                          json={"product_id": sample_product["id"], "content_type": "seo_article"},
                          timeout=60)
        assert r.status_code == 200, r.text
        return r.json()

    def test_publish_and_list(self, auth_headers, draft):
        title = f"Smart Deal Hub {uuid.uuid4().hex[:6]}"
        r = requests.post(f"{BASE_URL}/api/admin/blog/publish", headers=auth_headers, json={
            "draft_id": draft["id"], "title": title,
            "meta_description": "Test post meta description."
        }, timeout=15)
        assert r.status_code == 200, r.text
        post = r.json()
        assert post["slug"]
        assert post["title"] == title

        # List
        lst = requests.get(f"{BASE_URL}/api/blog", timeout=15).json()
        assert any(p["slug"] == post["slug"] for p in lst)

        # Get by slug returns full content
        full = requests.get(f"{BASE_URL}/api/blog/{post['slug']}", timeout=15)
        assert full.status_code == 200
        fdata = full.json()
        assert "content" in fdata and len(fdata["content"]) > 0

        # Draft marked published
        drafts = requests.get(f"{BASE_URL}/api/admin/ai/drafts", headers=auth_headers, timeout=15).json()
        this = next((d for d in drafts if d["id"] == draft["id"]), None)
        assert this is not None
        assert this.get("status") == "published"

        # Delete
        d = requests.delete(f"{BASE_URL}/api/admin/blog/{post['id']}", headers=auth_headers, timeout=15)
        assert d.status_code == 200
        assert d.json()["deleted"] == 1
        gone = requests.get(f"{BASE_URL}/api/blog/{post['slug']}", timeout=15)
        assert gone.status_code == 404


# -------- Sitemap / Robots --------
class TestSeo:
    def test_sitemap(self):
        r = requests.get(f"{BASE_URL}/api/sitemap.xml", timeout=15)
        assert r.status_code == 200
        assert "application/xml" in r.headers.get("content-type", "")
        assert "<urlset" in r.text
        assert "/product/" in r.text
        assert "/category/" in r.text

    def test_robots(self):
        r = requests.get(f"{BASE_URL}/api/robots.txt", timeout=15)
        assert r.status_code == 200
        assert "text/plain" in r.headers.get("content-type", "")
        assert "User-agent" in r.text
        assert "Sitemap:" in r.text


# -------- Feed Import --------
class TestFeedImport:
    def test_import_and_idempotent(self, auth_headers):
        unique = uuid.uuid4().hex[:8]
        item = {
            "name": f"TEST_ImportedItem_{unique}",
            "category": "technology",
            "image": "https://example.com/x.jpg",
            "price": 49.99,
            "old_price": 79.99,
            "affiliate_url": f"https://www.amazon.com/dp/BTEST{unique}",
        }
        payload = {"associate_tag": "dhai-20", "items": [item]}
        r = requests.post(f"{BASE_URL}/api/admin/import/feed", headers=auth_headers, json=payload, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["created"] == 1
        assert data["updated"] == 0

        # Verify tag appended
        prods = requests.get(f"{BASE_URL}/api/products?search=TEST_ImportedItem_{unique}", timeout=15).json()
        matched = [p for p in prods["items"] if p["name"] == item["name"]]
        assert matched
        assert "tag=dhai-20" in matched[0]["affiliate_url"]

        # Re-import same feed -> should update, not duplicate
        # Note: after first import, affiliate_url now contains tag=. Second call will match by that url.
        item2 = dict(item)
        item2["affiliate_url"] = matched[0]["affiliate_url"]  # url with tag
        item2["price"] = 39.99
        r2 = requests.post(f"{BASE_URL}/api/admin/import/feed", headers=auth_headers,
                           json={"associate_tag": "dhai-20", "items": [item2]}, timeout=20)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["updated"] == 1
        assert d2["created"] == 0

        # Cleanup
        pid = matched[0]["id"]
        requests.delete(f"{BASE_URL}/api/admin/products/{pid}", headers=auth_headers, timeout=15)


# -------- Change Password --------
class TestChangePassword:
    def test_full_flow(self):
        # Login
        login = requests.post(f"{BASE_URL}/api/auth/login",
                              json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        assert login.status_code == 200
        tok = login.json()["access_token"]
        h = {"Authorization": f"Bearer {tok}"}

        # wrong current
        r = requests.post(f"{BASE_URL}/api/auth/change-password", headers=h,
                          json={"current_password": "WrongOne!!", "new_password": "NewPass123!"}, timeout=15)
        assert r.status_code == 400
        assert "Current password is incorrect" in r.text

        # short new
        r = requests.post(f"{BASE_URL}/api/auth/change-password", headers=h,
                          json={"current_password": ADMIN_PASSWORD, "new_password": "short"}, timeout=15)
        assert r.status_code == 400

        # correct change
        new_pw = "TempPass2026!"
        r = requests.post(f"{BASE_URL}/api/auth/change-password", headers=h,
                          json={"current_password": ADMIN_PASSWORD, "new_password": new_pw}, timeout=15)
        assert r.status_code == 200, r.text

        # login with new
        l2 = requests.post(f"{BASE_URL}/api/auth/login",
                           json={"email": ADMIN_EMAIL, "password": new_pw}, timeout=15)
        assert l2.status_code == 200

        # reset back
        h2 = {"Authorization": f"Bearer {l2.json()['access_token']}"}
        r3 = requests.post(f"{BASE_URL}/api/auth/change-password", headers=h2,
                           json={"current_password": new_pw, "new_password": ADMIN_PASSWORD}, timeout=15)
        assert r3.status_code == 200

        # verify original works
        l3 = requests.post(f"{BASE_URL}/api/auth/login",
                           json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        assert l3.status_code == 200


# -------- Site Settings --------
class TestSiteSettings:
    def test_defaults_and_persist(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/admin/site-settings", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data.get("site_name") == "Deal Hunter AI" or "site_name" in data
        assert "tagline" in data
        assert "default_country" in data
        assert "default_currency" in data
        assert "affiliate_disclosure" in data

        # persist
        payload = {
            "site_name": "Deal Hunter AI",
            "tagline": "Find Better Deals With AI (updated)",
            "support_email": "help@example.com",
            "default_country": "US",
            "default_currency": "USD",
            "affiliate_disclosure": "Test disclosure."
        }
        r2 = requests.post(f"{BASE_URL}/api/admin/site-settings", headers=auth_headers, json=payload, timeout=15)
        assert r2.status_code == 200
        r3 = requests.get(f"{BASE_URL}/api/admin/site-settings", headers=auth_headers, timeout=15).json()
        assert r3["tagline"] == payload["tagline"]
        assert r3["support_email"] == "help@example.com"
