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
    return AdminUser(email="narkadhai.official@gmail.com", name="Owner", role="owner")


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
        mock_supabase.table().select().execute.return_value.data = [{"email": "narkadhai.official@gmail.com"}]

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
        self.assertEqual(resp.json()["email"], "narkadhai.official@gmail.com")

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
        user1.email = "narkadhai.official@gmail.com"
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
        user1.email = "narkadhai.official@gmail.com"
        mock_supabase.auth.admin.list_users.return_value = [user1]

        resp = client.post(
            "/api/admin/change-password",
            json={"new_password": "newStrongPassword123!"},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["ok"], True)

    @patch("app.services.email_service.send_admin_welcome_email", return_value=True)
    @patch("app.routers.admin.get_supabase", return_value=mock_supabase)
    def test_add_admin_creates_auth_user_with_default_password(self, mock_get_db, mock_send_welcome):
        """Test that adding an admin creates the Supabase Auth user with default password Narkadhai@2024 and sends welcome email."""
        app.dependency_overrides[require_owner] = mock_owner_admin

        # Mock no existing admin in table
        mock_supabase.table().select().eq().execute.return_value.data = []
        # Mock auth.users list (no existing user)
        mock_supabase.auth.admin.list_users.return_value = []
        # Mock auth create_user
        mock_supabase.auth.admin.create_user.return_value = MagicMock(id="new-u-1")
        # Mock table insert
        mock_supabase.table().insert().execute.return_value.data = [
            {"id": "a-123", "email": "newadmin@example.com", "name": "newadmin", "role": "audit"}
        ]

        resp = client.post(
            "/api/admin/admins",
            json={"email": "newadmin@example.com", "role": "audit"},
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["email"], "newadmin@example.com")
        self.assertEqual(data["role"], "audit")

        # Verify auth user was created with default password Narkadhai@2024 and email_confirm=True
        mock_supabase.auth.admin.create_user.assert_called_once_with({
            "email": "newadmin@example.com",
            "password": "Narkadhai@2024",
            "email_confirm": True,
            "user_metadata": {"name": "newadmin", "role": "audit"},
        })

        # Verify welcome email was sent with credentials
        mock_send_welcome.assert_called_once_with(
            admin_email="newadmin@example.com",
            default_password="Narkadhai@2024",
            role="audit",
        )

    @patch("app.routers.admin.get_supabase", return_value=mock_supabase)
    def test_check_authorized_endpoint(self, mock_get_db):
        """Test public check-authorized endpoint for magic link security."""
        # 1. Authorized email
        mock_supabase.table().select().ilike().execute.return_value.data = [
            {"id": "a1", "email": "authorized@narkadhai.org", "role": "audit"}
        ]
        resp = client.post(
            "/api/admin/check-authorized",
            json={"email": "authorized@narkadhai.org"},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["authorized"], True)

        # 2. Unauthorized email
        mock_supabase.table().select().ilike().execute.return_value.data = []
        resp_unauth = client.post(
            "/api/admin/check-authorized",
            json={"email": "hacker@example.com"},
        )
        self.assertEqual(resp_unauth.status_code, 200)
        self.assertEqual(resp_unauth.json()["authorized"], False)

    def test_verify_access_authorized(self):
        """Test verify-access returns admin info when authorized."""
        app.dependency_overrides[require_audit_or_owner] = mock_owner_admin
        resp = client.get("/api/admin/verify-access")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["ok"], True)
        self.assertEqual(resp.json()["email"], "narkadhai.official@gmail.com")

    @patch("app.services.auth_service.get_supabase")
    def test_unauthorized_access_raises_access_denied_message(self, mock_get_db):
        """Test that unauthorized account receives exact 'Access Denied - You are not authorized to access this area' error."""
        from app.services.auth_service import get_current_admin
        from fastapi import HTTPException
        from fastapi.security import HTTPAuthorizationCredentials

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_user = MagicMock()
        mock_user.id = "stranger-123"
        mock_user.email = "stranger@example.com"
        mock_user.user_metadata = {}
        mock_user.app_metadata = {}
        mock_db.auth.get_user.return_value.user = mock_user

        # User is NOT in authorized_admins table
        mock_db.table().select().ilike().execute.return_value.data = []

        import asyncio
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="mock-token-stranger")
        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(get_current_admin(creds))

        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(ctx.exception.detail, "Access Denied - You are not authorized to access this area")

    @patch("app.services.email_service.get_email_service")
    def test_send_admin_welcome_email_content(self, mock_get_svc):
        """Test that welcome email contains all required details."""
        from app.services.email_service import send_admin_welcome_email
        mock_svc = MagicMock()
        mock_get_svc.return_value = mock_svc

        success = send_admin_welcome_email(
            admin_email="testadmin@example.com",
            default_password="Narkadhai@2024",
            role="audit",
        )
        self.assertTrue(success)
        mock_svc.send.assert_called_once()
        kwargs = mock_svc.send.call_args[1]
        self.assertEqual(kwargs["to"], "testadmin@example.com")
        self.assertIn("You have been added as an admin for Narkadhai", kwargs["subject"])
        html = kwargs["html"]
        self.assertIn("You have been added as an admin for Narkadhai.", html)
        self.assertIn("https://narkadhai.vercel.app/admin", html)
        self.assertIn("testadmin@example.com", html)
        self.assertIn("Narkadhai@2024", html)
        self.assertIn("Please change your password after first login.", html)

    @patch("app.services.auth_service.get_supabase")
    def test_auth_fallback_with_mock_user(self, mock_get_db):
        """Test that auth_service falls back to supabase.auth.get_user when JWT decode is not used."""
        from app.services.auth_service import get_current_admin
        from fastapi.security import HTTPAuthorizationCredentials

        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_user = MagicMock()
        mock_user.id = "user-123"
        mock_user.email = "narkadhai.official@gmail.com"
        mock_user.user_metadata = {}
        mock_user.app_metadata = {}
        mock_db.auth.get_user.return_value.user = mock_user

        mock_db.table().select().ilike().execute.return_value.data = [
            {"email": "narkadhai.official@gmail.com", "name": "Owner", "role": "owner"}
        ]

        import asyncio
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials="mock-supabase-token")
        admin = asyncio.run(get_current_admin(creds))
        self.assertEqual(admin.email, "narkadhai.official@gmail.com")
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

    @patch("app.services.email_service.build")
    @patch("app.services.email_service.Credentials")
    def test_gmail_api_email_service_success(self, mock_creds_cls, mock_build):
        """Test successful email send via Gmail REST API with OAuth2."""
        import base64
        from app.services.email_service import GmailAPIEmailService
        from app.config import settings

        mock_creds = MagicMock()
        mock_creds.valid = True
        mock_creds_cls.return_value = mock_creds

        mock_service = MagicMock()
        mock_build.return_value = mock_service
        mock_send_exec = mock_service.users.return_value.messages.return_value.send.return_value.execute
        mock_send_exec.return_value = {"id": "gmail_msg_123"}

        with patch.object(settings, "GMAIL_USER", "narkadhai.official@gmail.com"), \
             patch.object(settings, "GMAIL_CLIENT_ID", "test_client_id"), \
             patch.object(settings, "GMAIL_CLIENT_SECRET", "test_client_secret"), \
             patch.object(settings, "GMAIL_REFRESH_TOKEN", "test_refresh_token"), \
             patch.object(settings, "EMAIL_FROM", "Narkadhai <narkadhai.official@gmail.com>"), \
             patch.object(settings, "EMAIL_REPLY_TO", "narkadhai.official@gmail.com"):
            svc = GmailAPIEmailService()
            svc.send(to="donor@example.com", subject="Thank you", html="<p>Thanks!</p>")

            mock_build.assert_called_once_with("gmail", "v1", credentials=mock_creds, cache_discovery=False)
            mock_service.users.return_value.messages.return_value.send.assert_called_once()

            call_kwargs = mock_service.users.return_value.messages.return_value.send.call_args[1]
            self.assertEqual(call_kwargs["userId"], "me")
            raw_b64 = call_kwargs["body"]["raw"]
            raw_decoded = base64.urlsafe_b64decode(raw_b64.encode("utf-8")).decode("utf-8", errors="ignore")

            self.assertIn("Subject: Thank you", raw_decoded)
            self.assertIn("From: Narkadhai <narkadhai.official@gmail.com>", raw_decoded)
            self.assertIn("Reply-To: narkadhai.official@gmail.com", raw_decoded)
            self.assertIn("To: donor@example.com", raw_decoded)

    def test_gmail_api_email_service_missing_credentials(self):
        """Test error when GMAIL_REFRESH_TOKEN or OAuth credentials are missing."""
        from app.services.email_service import GmailAPIEmailService
        from app.config import settings

        with patch.object(settings, "GMAIL_CLIENT_ID", "test_id"), \
             patch.object(settings, "GMAIL_CLIENT_SECRET", "test_secret"), \
             patch.object(settings, "GMAIL_REFRESH_TOKEN", ""):
            svc = GmailAPIEmailService()
            with self.assertRaises(RuntimeError) as ctx:
                svc.send(to="donor@example.com", subject="Thank you", html="<p>Thanks!</p>")
            self.assertIn("Gmail OAuth2 credentials", str(ctx.exception))

    def test_get_email_service_factory(self):
        """Test get_email_service returns LogEmailService when log/empty, and GmailAPIEmailService when configured."""
        from app.services.email_service import get_email_service, LogEmailService, GmailAPIEmailService
        from app.config import settings

        with patch.object(settings, "GMAIL_CLIENT_ID", "id"), \
             patch.object(settings, "GMAIL_CLIENT_SECRET", "sec"), \
             patch.object(settings, "GMAIL_REFRESH_TOKEN", "log"):
            svc = get_email_service()
            self.assertIsInstance(svc, LogEmailService)

        with patch.object(settings, "GMAIL_CLIENT_ID", "id"), \
             patch.object(settings, "GMAIL_CLIENT_SECRET", "sec"), \
             patch.object(settings, "GMAIL_REFRESH_TOKEN", "1//real_refresh_token"):
            svc = get_email_service()
            self.assertIsInstance(svc, GmailAPIEmailService)

    @patch("app.routers.settings_router.get_supabase")
    def test_backup_qr_settings_allowed(self, mock_get_db):
        """Test that qr_code_url_2, qr_code_label_1 and qr_code_label_2 can be updated by owner."""
        app.dependency_overrides[require_owner] = mock_owner_admin
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        resp = client.put(
            "/api/settings",
            json={"updates": {
                "qr_code_label_1": "Primary QR (GPay)",
                "qr_code_url_2": "https://example.com/backup-qr.png",
                "qr_code_label_2": "PhonePe QR",
            }},
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["ok"], True)

    @patch("app.services.email_service.send_donor_thankyou", return_value=True)
    @patch("app.services.email_service.send_owner_donation_notification", return_value=True)
    @patch("app.routers.donations.check_rate_limit", return_value=True)
    @patch("app.routers.donations.get_supabase")
    def test_submit_donation_with_payment_qr_used(self, mock_get_db, mock_rl, mock_owner_email, mock_donor_email):
        """Test that payment_qr_used is accepted and saved during donation submission."""
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        # No duplicate
        mock_db.table().select().eq().eq().gte().execute.return_value.data = []
        mock_db.table().select().eq().eq().gte().execute.return_value.count = 0
        # Insert success
        mock_db.table().insert().execute.return_value.data = [
            {"id": "don-backup-1", "donor_name": "Bob", "amount": 1000, "payment_qr_used": "backup"}
        ]
        # Admins
        mock_db.table().select().execute.return_value.data = []

        resp = client.post(
            "/api/donations",
            json={
                "donor_name": "Bob",
                "donor_email": "bob@example.com",
                "amount": 1000,
                "payment_qr_used": "backup",
            },
        )
        self.assertEqual(resp.status_code, 201)
        # Check that insert was called with payment_qr_used="backup"
        insert_args = mock_db.table().insert.call_args[0][0]
        self.assertEqual(insert_args["payment_qr_used"], "backup")

    @patch("app.routers.albums.get_supabase")
    def test_add_video_to_album(self, mock_get_db):
        """Test that media_type='video' is accepted and stored when adding media to an album."""
        app.dependency_overrides[require_owner] = mock_owner_admin
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        mock_db.table().insert().execute.return_value.data = [
            {"id": "photo-vid-1", "album_id": "alb-1", "photo_url": "https://example.com/video.mp4", "media_type": "video"}
        ]

        resp = client.post(
            "/api/albums/alb-1/photos",
            json={
                "photo_url": "https://example.com/video.mp4",
                "caption": "Visit Highlights",
                "media_type": "video",
            },
        )
        self.assertEqual(resp.status_code, 201)
        insert_args = mock_db.table().insert.call_args[0][0]
        self.assertEqual(insert_args["media_type"], "video")
        self.assertEqual(insert_args["photo_url"], "https://example.com/video.mp4")

    @patch("app.routers.albums.get_supabase")
    def test_delete_photo_updates_cover_to_next(self, mock_get_db):
        """Test that deleting the album's cover photo automatically reassigns cover to next photo."""
        app.dependency_overrides[require_owner] = mock_owner_admin
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        album_photos_table = MagicMock()
        albums_table = MagicMock()

        mock_db.table.side_effect = lambda t: album_photos_table if t == "album_photos" else albums_table

        # Photo being deleted was https://example.com/cover.jpg
        album_photos_table.select().eq().eq().single().execute.return_value.data = {
            "photo_url": "https://example.com/cover.jpg"
        }
        # Album cover was https://example.com/cover.jpg
        albums_table.select().eq().single().execute.return_value.data = {
            "cover_photo_url": "https://example.com/cover.jpg"
        }
        # Remaining photos has p2.jpg
        album_photos_table.select().eq().order().execute.return_value.data = [
            {"photo_url": "https://example.com/p2.jpg", "media_type": "image"}
        ]

        resp = client.delete("/api/albums/alb-1/photos/p-1")
        self.assertEqual(resp.status_code, 204)

        # Verify album cover was updated to p2.jpg
        albums_table.update.assert_called_once_with({"cover_photo_url": "https://example.com/p2.jpg"})

    @patch("app.routers.albums.get_supabase")
    def test_delete_photo_clears_cover_when_no_photos_remain(self, mock_get_db):
        """Test that deleting the last photo sets cover_photo_url to None."""
        app.dependency_overrides[require_owner] = mock_owner_admin
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        album_photos_table = MagicMock()
        albums_table = MagicMock()

        mock_db.table.side_effect = lambda t: album_photos_table if t == "album_photos" else albums_table

        album_photos_table.select().eq().eq().single().execute.return_value.data = {
            "photo_url": "https://example.com/cover.jpg"
        }
        albums_table.select().eq().single().execute.return_value.data = {
            "cover_photo_url": "https://example.com/cover.jpg"
        }
        album_photos_table.select().eq().order().execute.return_value.data = []

        resp = client.delete("/api/albums/alb-1/photos/p-1")
        self.assertEqual(resp.status_code, 204)

        albums_table.update.assert_called_once_with({"cover_photo_url": None})

    @patch("app.routers.albums.get_supabase")
    def test_reorder_photos(self, mock_get_db):
        """Test that reordering photos updates their display_order."""
        app.dependency_overrides[require_owner] = mock_owner_admin
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db

        album_photos_table = MagicMock()
        mock_db.table.return_value = album_photos_table
        album_photos_table.update().eq().eq().execute.return_value.data = [{"id": "p1", "display_order": 0}]

        payload = {
            "photos": [
                {"photo_id": "p1", "display_order": 0},
                {"photo_id": "p2", "display_order": 1},
            ]
        }
        resp = client.put("/api/albums/alb-1/photos/reorder", json=payload)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "ok")


if __name__ == "__main__":
    unittest.main()



