import sys
import unittest
from unittest.mock import MagicMock, patch

# Add backend directory to path
sys.path.insert(0, ".")

import app.db
with patch("app.db.create_client"), patch("supabase.create_client"):
    from app.main import app
    from app.services.auth_service import AdminUser, require_owner, require_audit_or_owner

from fastapi.testclient import TestClient

client = TestClient(app)
mock_supabase = MagicMock()


def mock_owner_admin():
    return AdminUser(email="support.narkadhai@gmail.com", name="Owner", role="owner")


def mock_audit_admin():
    return AdminUser(email="auditor@narkadhai.org", name="Auditor", role="audit")


class TestAdminEndpoints(unittest.TestCase):
    def setUp(self):
        app.dependency_overrides = {}
        mock_supabase.reset_mock()

    def test_cors_headers(self):
        """Test CORS preflight and response headers for https://narkadhai.vercel.app"""
        # Test OPTIONS preflight request
        resp = client.options(
            "/api/members",
            headers={
                "Origin": "https://narkadhai.vercel.app",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Authorization, Content-Type",
            },
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers.get("access-control-allow-origin"), "https://narkadhai.vercel.app")

        # Test GET request CORS header
        resp = client.get(
            "/api/health",
            headers={"Origin": "https://narkadhai.vercel.app"},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers.get("access-control-allow-origin"), "https://narkadhai.vercel.app")

    @patch("app.routers.members.get_supabase", return_value=mock_supabase)
    def test_create_update_delete_member(self, mock_get_db):
        """Test adding, updating, and deleting a member as owner."""
        app.dependency_overrides[require_owner] = mock_owner_admin
        mock_supabase.table().insert().execute.return_value.data = [
            {"id": "m1", "name": "John Doe", "role": "Volunteer", "bio": "Helps out", "photo_url": "https://example.com/p.jpg", "display_order": 1}
        ]
        mock_supabase.table().update().eq().execute.return_value.data = [
            {"id": "m1", "name": "John Updated", "role": "Lead", "bio": "Helps out", "photo_url": "https://example.com/p.jpg", "display_order": 1}
        ]
        mock_supabase.table().delete().eq().execute.return_value.data = []

        # Create
        resp = client.post(
            "/api/members",
            json={"name": "John Doe", "role": "Volunteer", "bio": "Helps out", "photo_url": "https://example.com/p.jpg", "display_order": 1},
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["name"], "John Doe")

        # Update
        resp_put = client.put(
            "/api/members/m1",
            json={"name": "John Updated", "role": "Lead"},
        )
        self.assertEqual(resp_put.status_code, 200)
        self.assertEqual(resp_put.json()["name"], "John Updated")

        # Delete
        resp_del = client.delete("/api/members/m1")
        self.assertEqual(resp_del.status_code, 204)

    @patch("app.routers.settings_router.get_supabase", return_value=mock_supabase)
    def test_update_settings_qr(self, mock_get_db):
        """Test updating QR code URL and settings as owner."""
        app.dependency_overrides[require_owner] = mock_owner_admin
        mock_supabase.table().upsert().execute.return_value.data = []

        # Test PUT
        resp = client.put(
            "/api/settings",
            json={"updates": {"qr_code_url": "https://storage.supabase.co/qr-codes/qr.png", "donation_target_amount": "500000"}},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"ok": True})

        # Test POST
        resp_post = client.post(
            "/api/settings",
            json={"updates": {"donation_target_amount": "600000"}},
        )
        self.assertEqual(resp_post.status_code, 200)

    @patch("app.routers.albums.get_supabase", return_value=mock_supabase)
    def test_create_update_delete_album(self, mock_get_db):
        """Test creating, updating, and deleting an album as owner."""
        app.dependency_overrides[require_owner] = mock_owner_admin
        mock_supabase.table().insert().execute.return_value.data = [
            {"id": "a1", "home_name": "Hope Home", "visit_date": "2026-08-15", "description": "Location: Chennai\nContact: 9876543210\n\nGreat visit"}
        ]
        mock_supabase.table().update().eq().execute.return_value.data = [
            {"id": "a1", "home_name": "Hope Home Updated", "visit_date": "2026-08-15", "description": "Updated"}
        ]
        mock_supabase.table().delete().eq().execute.return_value.data = []

        # Create
        resp = client.post(
            "/api/albums",
            json={"home_name": "Hope Home", "visit_date": "2026-08-15", "description": "Location: Chennai\nContact: 9876543210\n\nGreat visit"},
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["home_name"], "Hope Home")

        # Update
        resp_put = client.put(
            "/api/albums/a1",
            json={"home_name": "Hope Home Updated"},
        )
        self.assertEqual(resp_put.status_code, 200)

        # Delete
        resp_del = client.delete("/api/albums/a1")
        self.assertEqual(resp_del.status_code, 204)

    @patch("app.routers.albums.get_supabase", return_value=mock_supabase)
    def test_add_delete_album_photo(self, mock_get_db):
        """Test adding and deleting a photo from an album."""
        app.dependency_overrides[require_owner] = mock_owner_admin
        mock_supabase.table().insert().execute.return_value.data = [
            {"id": "p1", "album_id": "a1", "photo_url": "https://storage.supabase.co/album-photos/p1.jpg", "caption": ""}
        ]
        mock_supabase.table().select().eq().single().execute.return_value.data = {"cover_photo_url": None}
        mock_supabase.table().update().eq().execute.return_value.data = []
        mock_supabase.table().delete().eq().eq().execute.return_value.data = []

        resp = client.post(
            "/api/albums/a1/photos",
            json={"photo_url": "https://storage.supabase.co/album-photos/p1.jpg", "caption": ""},
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["photo_url"], "https://storage.supabase.co/album-photos/p1.jpg")

        resp_del = client.delete("/api/albums/a1/photos/p1")
        self.assertEqual(resp_del.status_code, 204)

    @patch("app.routers.donations.get_supabase", return_value=mock_supabase)
    def test_verify_donation(self, mock_get_db):
        """Test verifying a donation status."""
        app.dependency_overrides[require_audit_or_owner] = mock_audit_admin
        mock_supabase.table().select().eq().execute.return_value.data = [{"id": "d1", "status": "pending"}]
        mock_supabase.table().update().eq().execute.return_value.data = [{"id": "d1", "status": "verified", "verified_by": "auditor@narkadhai.org"}]

        resp = client.patch(
            "/api/donations/d1/status",
            json={"status": "verified"},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "verified")

    @patch("app.routers.admin.get_supabase", return_value=mock_supabase)
    def test_get_dashboard(self, mock_get_db):
        """Test fetching dashboard summary stats."""
        app.dependency_overrides[require_audit_or_owner] = mock_owner_admin
        mock_supabase.rpc().execute.return_value.data = [{"reported_total": 5000, "verified_total": 3000, "reported_count": 5, "verified_count": 3}]
        mock_supabase.table().select().order().limit().execute.return_value.data = []
        mock_supabase.table().select().eq().execute.return_value.count = 2
        mock_supabase.table().select().eq().execute.return_value.data = [{"value": "100000"}]

        resp = client.get("/api/admin/dashboard")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("totals", data)
        self.assertEqual(data["totals"]["reported_total"], 5000)

    def test_get_me(self):
        """Test getting current admin profile."""
        app.dependency_overrides[require_audit_or_owner] = mock_owner_admin
        resp = client.get("/api/admin/me")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["email"], "support.narkadhai@gmail.com")

    @patch("app.routers.admin.get_supabase", return_value=mock_supabase)
    def test_change_email(self, mock_get_db):
        """Test self-service email change for logged in admin."""
        app.dependency_overrides[require_audit_or_owner] = mock_owner_admin

        # Check existing returns empty (email is available)
        mock_supabase.table().select().eq().execute.return_value.data = []
        mock_supabase.table().update().ilike().execute.return_value.data = [
            {"email": "newowner@narkadhai.org", "name": "newowner", "role": "owner"}
        ]

        user1 = MagicMock()
        user1.id = "u1"
        user1.email = "support.narkadhai@gmail.com"
        mock_supabase.auth.admin.list_users.return_value = [user1]

        resp = client.post(
            "/api/admin/change-email",
            json={"new_email": "newowner@narkadhai.org"},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["email"], "newowner@narkadhai.org")

    @patch("app.routers.admin.get_supabase", return_value=mock_supabase)
    def test_change_password(self, mock_get_db):
        """Test self-service password change for logged in admin."""
        app.dependency_overrides[require_audit_or_owner] = mock_owner_admin

        user1 = MagicMock()
        user1.id = "u1"
        user1.email = "support.narkadhai@gmail.com"
        mock_supabase.auth.admin.list_users.return_value = [user1]

        resp = client.post(
            "/api/admin/change-password",
            json={"new_password": "newStrongPassword123!"},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["ok"], True)

    @patch("app.services.auth_service.get_supabase")
    def test_auth_fallback_with_mock_user(self, mock_get_db):
        """Test that auth_service falls back to supabase.auth.get_user when JWT decode is not used."""
        from app.services.auth_service import get_current_admin
        from fastapi.security import HTTPAuthorizationCredentials

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_user.email = "support.narkadhai@gmail.com"
        mock_user.user_metadata = {}
        mock_user.app_metadata = {}
        mock_db.auth.get_user.return_value.user = mock_user

        mock_db.table().select().ilike().execute.return_value.data = [
            {"email": "support.narkadhai@gmail.com", "name": "Owner", "role": "owner"}
        ]

        import asyncio
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="mock-supabase-token")
        admin = asyncio.run(get_current_admin(creds))
        self.assertEqual(admin.email, "support.narkadhai@gmail.com")
        self.assertEqual(admin.role, "owner")
        self.assertTrue(admin.is_owner)


if __name__ == "__main__":
    unittest.main()
