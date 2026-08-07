import sys
import unittest
from unittest.mock import MagicMock, patch

# Add backend directory to path
sys.path.append(".")

# Mock supabase to import app safely without credentials
with patch("app.db.create_client"), patch("supabase.create_client"):
    from app.main import app
    from app.services.auth_service import AdminUser

from fastapi.testclient import TestClient

client = TestClient(app)
mock_supabase = MagicMock()


# Helper mocks
def mock_owner_admin():
    return AdminUser(email="support.narkadhai@gmail.com", name="Owner", role="owner")


def mock_audit_admin():
    return AdminUser(email="auditor@narkadhai.org", name="Auditor", role="audit")


class TestAdminOps(unittest.TestCase):
    def setUp(self):
        app.dependency_overrides = {}
        mock_supabase.reset_mock()

    def test_album_formatting_helper(self):
        location = "Chennai, TN"
        contact = "+91 99999 88888"
        desc = "We had a wonderful visit."
        formatted = f"Location: {location}\nContact: {contact}\n\n{desc}"

        import re
        match = re.match(
            r"^Location:\s*(.*)\nContact:\s*(.*)\n\n([\s\S]*)$", formatted
        )
        self.assertIsNotNone(match)
        self.assertEqual(match.group(1).strip(), location)
        self.assertEqual(match.group(2).strip(), contact)
        self.assertEqual(match.group(3).strip(), desc)

    def test_get_me_endpoint(self):
        from app.services.auth_service import require_audit_or_owner

        # Case 1: Owner Role
        app.dependency_overrides[require_audit_or_owner] = mock_owner_admin
        resp = client.get("/api/admin/me")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            resp.json(),
            {
                "email": "support.narkadhai@gmail.com",
                "name": "Owner",
                "role": "owner",
            },
        )

        # Case 2: Audit Role
        app.dependency_overrides[require_audit_or_owner] = mock_audit_admin
        resp = client.get("/api/admin/me")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(
            resp.json(),
            {
                "email": "auditor@narkadhai.org",
                "name": "Auditor",
                "role": "audit",
            },
        )

    @patch("app.routers.admin.get_supabase", return_value=mock_supabase)
    def test_list_admins_endpoint(self, mock_get_db):
        from app.services.auth_service import require_owner

        app.dependency_overrides[require_owner] = mock_owner_admin

        # Mock database response
        mock_supabase.table().select().execute.return_value.data = [
            {
                "id": "1",
                "email": "support.narkadhai@gmail.com",
                "name": "Owner",
                "role": "owner",
                "created_at": "2026-08-07T00:00:00Z",
            },
            {
                "id": "2",
                "email": "auditor@narkadhai.org",
                "name": "Auditor",
                "role": "audit",
                "created_at": "2026-08-07T01:00:00Z",
            },
        ]

        # Mock list_users response
        user1 = MagicMock()
        user1.email = "support.narkadhai@gmail.com"
        user1.last_sign_in_at = MagicMock()
        user1.last_sign_in_at.isoformat.return_value = "2026-08-07T12:00:00Z"

        user2 = MagicMock()
        user2.email = "auditor@narkadhai.org"
        user2.last_sign_in_at = None

        mock_supabase.auth.admin.list_users.return_value = [user1, user2]

        resp = client.get("/api/admin/admins")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]["last_login"], "2026-08-07T12:00:00Z")
        self.assertEqual(data[1]["last_login"], None)

    @patch("app.routers.admin.get_supabase", return_value=mock_supabase)
    def test_delete_admin_protections(self, mock_get_db):
        from app.services.auth_service import require_owner

        app.dependency_overrides[require_owner] = mock_owner_admin

        # Mock database return for deleting support.narkadhai@gmail.com
        mock_supabase.table().select().eq().single().execute.return_value.data = {
            "email": "support.narkadhai@gmail.com"
        }

        resp = client.delete("/api/admin/admins/some-id")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("cannot be removed", resp.json()["detail"])


if __name__ == "__main__":
    unittest.main()
