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
    def test_verify_and_reject_donation(self, mock_get_db):
        """Test verifying and rejecting a donation status."""
        app.dependency_overrides[require_audit_or_owner] = mock_audit_admin
        mock_supabase.table().select().eq().execute.return_value.data = [{"id": "d1", "status": "pending"}]
        mock_supabase.table().update().eq().execute.return_value.data = [{"id": "d1", "status": "verified", "verified_by": "auditor@narkadhai.org"}]

        # Test PATCH verify
        resp = client.patch(
            "/api/donations/d1/status",
            json={"status": "verified"},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "verified")

        # Test PUT reject
        mock_supabase.table().update().eq().execute.return_value.data = [{"id": "d1", "status": "rejected", "verified_by": "auditor@narkadhai.org"}]
        resp_put = client.put(
            "/api/donations/d1/status",
            json={"status": "rejected"},
        )
        self.assertEqual(resp_put.status_code, 200)
        self.assertEqual(resp_put.json()["status"], "rejected")

    @patch("app.routers.contact.get_supabase", return_value=mock_supabase)
    def test_contact_messages_flow(self, mock_get_db):
        """Test public contact form submission, admin list, mark read, and delete."""
        # 1. Public submission
        mock_supabase.table().insert().execute.return_value.data = [
            {"id": "msg1", "name": "Alice", "email": "alice@example.com", "message": "Hello Narkadhai!", "is_read": False}
        ]
        mock_supabase.table().select().execute.return_value.data = [{"email": "support.narkadhai@gmail.com"}]

        resp_submit = client.post(
            "/api/contact",
            json={"name": "Alice", "email": "alice@example.com", "message": "Hello Narkadhai!"},
        )
        self.assertEqual(resp_submit.status_code, 201)
        self.assertIn("message", resp_submit.json())

        # 2. Admin listing
        app.dependency_overrides[require_audit_or_owner] = mock_owner_admin
        mock_supabase.table().select().order().execute.return_value.data = [
            {"id": "msg1", "name": "Alice", "email": "alice@example.com", "message": "Hello Narkadhai!", "is_read": False}
        ]
        resp_list = client.get("/api/contact")
        self.assertEqual(resp_list.status_code, 200)
        self.assertEqual(len(resp_list.json()), 1)

        # 3. Admin mark read
        mock_supabase.table().update().eq().execute.return_value.data = [
            {"id": "msg1", "is_read": True}
        ]
        resp_read = client.patch("/api/contact/msg1/read")
        self.assertEqual(resp_read.status_code, 200)

        # 4. Admin delete
        mock_supabase.table().delete().eq().execute.return_value.data = []
        resp_del = client.delete("/api/contact/msg1")
        self.assertEqual(resp_del.status_code, 204)

    @patch("app.routers.admin.get_supabase", return_value=mock_supabase)
    def test_get_dashboard(self, mock_get_db):
        """Test fetching dashboard summary stats accurately."""
        app.dependency_overrides[require_audit_or_owner] = mock_owner_admin

        # Mock table calls for donations and contact_messages
        mock_donations = [
            {"id": "d1", "donor_name": "Ravi", "donor_email": "ravi@example.com", "amount": 2000, "status": "verified", "created_at": "2026-08-19T00:00:00Z"},
            {"id": "d2", "donor_name": "Anita", "donor_email": "anita@example.com", "amount": 3000, "status": "pending", "created_at": "2026-08-19T01:00:00Z"},
            {"id": "d3", "donor_name": "Spam", "donor_email": "spam@example.com", "amount": 1000, "status": "rejected", "created_at": "2026-08-19T02:00:00Z"},
        ]
        mock_messages = [
            {"id": "m1", "name": "Alice", "email": "alice@example.com", "message": "Hi", "created_at": "2026-08-19T00:00:00Z", "is_read": False},
            {"id": "m2", "name": "Bob", "email": "bob@example.com", "message": "Thanks", "created_at": "2026-08-19T01:00:00Z", "is_read": True},
        ]

        def mock_table_select(table_name):
            mock_tbl = MagicMock()
            if table_name == "donations":
                mock_tbl.select.return_value.order.return_value.execute.return_value.data = mock_donations
            elif table_name == "contact_messages":
                mock_tbl.select.return_value.order.return_value.execute.return_value.data = mock_messages
            elif table_name == "settings":
                mock_tbl.select.return_value.eq.return_value.execute.return_value.data = [{"value": "500000"}]
            return mock_tbl

        mock_supabase.table.side_effect = mock_table_select

        resp = client.get("/api/admin/dashboard")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("totals", data)
        # Reported total excludes rejected = 2000 + 3000 = 5000
        self.assertEqual(data["totals"]["reported_total"], 5000)
        # Verified total = 2000
        self.assertEqual(data["totals"]["verified_total"], 2000)
        self.assertEqual(data["totals"]["reported_count"], 2)
        self.assertEqual(data["totals"]["verified_count"], 1)
        self.assertEqual(data["unread_messages"], 1)
        self.assertEqual(len(data["recent_donations"]), 3)
        self.assertEqual(len(data["recent_messages"]), 2)

        # Reset side effect
        mock_supabase.table.side_effect = None

    def test_send_custom_thank_you(self):
        """Test admin sending custom thank you email to donor."""
        app.dependency_overrides[require_audit_or_owner] = mock_owner_admin
        resp = client.post(
            "/api/donations/d1/send-thank-you",
            json={
                "to_email": "donor@example.com",
                "subject": "Thank You for Your Generous Heart - Narkadhai 🙏",
                "body": "Dear Donor,\n\nThank you so much for your support!",
            },
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["ok"], True)

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

    @patch("app.routers.donations.get_supabase", return_value=mock_supabase)
    def test_delete_donation_as_owner(self, mock_get_db):
        """Test deleting a donation record as owner."""
        app.dependency_overrides[require_owner] = mock_owner_admin
        mock_supabase.table().delete().eq().execute.return_value.data = []

        resp = client.delete("/api/donations/d1")
        self.assertEqual(resp.status_code, 204)

    @patch("app.routers.community_messages.get_supabase", return_value=mock_supabase)
    def test_community_messages_flow(self, mock_get_db):
        """Test submitting community message, public approved list, admin list, approval, and delete."""
        # 1. Public submission
        mock_supabase.table().insert().execute.return_value.data = [
            {"id": "cm1", "name": "Priya", "message": "Keep up the wonderful work!", "is_approved": False}
        ]
        resp_sub = client.post(
            "/api/community-messages",
            json={"name": "Priya", "message": "Keep up the wonderful work!"},
        )
        self.assertEqual(resp_sub.status_code, 201)
        self.assertEqual(resp_sub.json()["ok"], True)

        # 2. Public approved list
        mock_supabase.table().select().eq().order().execute.return_value.data = [
            {"id": "cm1", "name": "Priya", "message": "Keep up the wonderful work!", "is_approved": True}
        ]
        resp_app = client.get("/api/community-messages/approved")
        self.assertEqual(resp_app.status_code, 200)
        self.assertEqual(len(resp_app.json()), 1)

        # 3. Admin list all
        app.dependency_overrides[require_audit_or_owner] = mock_owner_admin
        mock_supabase.table().select().order().execute.return_value.data = [
            {"id": "cm1", "name": "Priya", "message": "Keep up the wonderful work!", "is_approved": False}
        ]
        resp_all = client.get("/api/community-messages")
        self.assertEqual(resp_all.status_code, 200)
        self.assertEqual(len(resp_all.json()), 1)

        # 4. Admin update approval status
        mock_supabase.table().update().eq().execute.return_value.data = [
            {"id": "cm1", "name": "Priya", "message": "Keep up the wonderful work!", "is_approved": True}
        ]
        resp_patch = client.patch(
            "/api/community-messages/cm1/status",
            json={"is_approved": True},
        )
        self.assertEqual(resp_patch.status_code, 200)
        self.assertEqual(resp_patch.json()["is_approved"], True)

        # 5. Admin delete
        mock_supabase.table().delete().eq().execute.return_value.data = []
        resp_del = client.delete("/api/community-messages/cm1")
        self.assertEqual(resp_del.status_code, 204)

    @patch("smtplib.SMTP")
    def test_gmail_smtp_email_service_success(self, mock_smtp_cls):
        """Test successful email send via Gmail SMTP."""
        from app.services.email_service import GmailSMTPEmailService
        from app.config import settings

        mock_server = MagicMock()
        mock_smtp_cls.return_value.__enter__.return_value = mock_server

        with patch.object(settings, "GMAIL_USER", "support.narkadhai@gmail.com"), \
             patch.object(settings, "GMAIL_APP_PASSWORD", "test_app_pwd"), \
             patch.object(settings, "SMTP_HOST", "smtp.gmail.com"), \
             patch.object(settings, "SMTP_PORT", 587), \
             patch.object(settings, "SMTP_TLS", True), \
             patch.object(settings, "EMAIL_FROM", "Narkadhai <support.narkadhai@gmail.com>"):
            svc = GmailSMTPEmailService()
            svc.send(to="donor@example.com", subject="Thank you", html="<p>Thanks!</p>")

            mock_smtp_cls.assert_called_once_with("smtp.gmail.com", 587, timeout=15)
            mock_server.starttls.assert_called_once()
            mock_server.login.assert_called_once_with("support.narkadhai@gmail.com", "test_app_pwd")
            mock_server.sendmail.assert_called_once()

            args, kwargs = mock_server.sendmail.call_args
            self.assertEqual(args[0], "Narkadhai <support.narkadhai@gmail.com>")
            self.assertEqual(args[1], ["donor@example.com"])
            self.assertIn("Subject: Thank you", args[2])
            self.assertIn("From: Narkadhai <support.narkadhai@gmail.com>", args[2])
            self.assertIn("To: donor@example.com", args[2])

    @patch("smtplib.SMTP")
    def test_gmail_smtp_email_service_failure_raises_runtime_error(self, mock_smtp_cls):
        """Test that SMTP failure raises a descriptive RuntimeError."""
        from app.services.email_service import GmailSMTPEmailService
        from app.config import settings

        mock_server = MagicMock()
        mock_server.sendmail.side_effect = Exception("SMTP authentication failed")
        mock_smtp_cls.return_value.__enter__.return_value = mock_server

        with patch.object(settings, "GMAIL_USER", "support.narkadhai@gmail.com"), \
             patch.object(settings, "GMAIL_APP_PASSWORD", "test_app_pwd"):
            svc = GmailSMTPEmailService()
            with self.assertRaises(RuntimeError) as ctx:
                svc.send(to="donor@example.com", subject="Thank you", html="<p>Thanks!</p>")
            self.assertIn("Failed to send email via Gmail SMTP", str(ctx.exception))
            self.assertIn("SMTP authentication failed", str(ctx.exception))

    def test_gmail_smtp_email_service_missing_credentials(self):
        """Test error when GMAIL_APP_PASSWORD is missing or set to log."""
        from app.services.email_service import GmailSMTPEmailService
        from app.config import settings

        with patch.object(settings, "GMAIL_USER", "support.narkadhai@gmail.com"), \
             patch.object(settings, "GMAIL_APP_PASSWORD", ""):
            svc = GmailSMTPEmailService()
            with self.assertRaises(RuntimeError) as ctx:
                svc.send(to="donor@example.com", subject="Thank you", html="<p>Thanks!</p>")
            self.assertIn("Gmail SMTP credentials", str(ctx.exception))

    def test_get_email_service_factory(self):
        """Test get_email_service returns LogEmailService when log/empty, and GmailSMTPEmailService when credentials present."""
        from app.services.email_service import get_email_service, LogEmailService, GmailSMTPEmailService
        from app.config import settings

        with patch.object(settings, "GMAIL_APP_PASSWORD", "log"):
            svc = get_email_service()
            self.assertIsInstance(svc, LogEmailService)

        with patch.object(settings, "GMAIL_USER", "support.narkadhai@gmail.com"), \
             patch.object(settings, "GMAIL_APP_PASSWORD", "secret123"):
            svc = get_email_service()
            self.assertIsInstance(svc, GmailSMTPEmailService)


if __name__ == "__main__":
    unittest.main()


