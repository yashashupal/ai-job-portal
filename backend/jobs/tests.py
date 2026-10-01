from unittest.mock import MagicMock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APITestCase


def register(client, email, role, **extra):
    body = {"email": email, "password": "StrongPass123", "first_name": "Test", "role": role, **extra}
    r = client.post("/api/auth/register/", body, format="json")
    assert r.status_code == 201, r.content
    return r.data["access"]


class PortalFlowTests(APITestCase):
    def auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")

    def test_full_flow(self):
        hirer = register(self.client, "boss@acme.com", "hirer", company_name="Acme")
        self.auth(hirer)
        r = self.client.post("/api/jobs/", {
            "title": "Django Developer", "location": "Indore", "work_mode": "hybrid",
            "job_type": "full_time", "description": "Build APIs.", "skills": ["Python", "python", "Django"],
            "salary_min": 600000, "salary_max": 900000,
        }, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        job_id = r.data["id"]
        self.assertEqual(r.data["company_name"], "Acme")
        self.assertEqual(r.data["skills"], ["Python", "Django"])

        self.client.credentials()
        r = self.client.get("/api/jobs/?q=django")
        self.assertEqual(r.data["count"], 1)

        applicant = register(self.client, "dev@mail.com", "applicant")
        self.auth(applicant)
        r = self.client.post("/api/jobs/", {"title": "x"}, format="json")
        self.assertEqual(r.status_code, 403)

        resume = SimpleUploadedFile("cv.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        if True:
            r = self.client.post(f"/api/jobs/{job_id}/apply/", {"cover_letter": "Hi", "resume": resume}, format="multipart")
            self.assertEqual(r.status_code, 201, r.content)
            resume2 = SimpleUploadedFile("cv.pdf", b"%PDF-1.4 test", content_type="application/pdf")
            r = self.client.post(f"/api/jobs/{job_id}/apply/", {"resume": resume2}, format="multipart")
            self.assertEqual(r.status_code, 400)
            bad = SimpleUploadedFile("cv.pdf", b"MZ not a pdf", content_type="application/octet-stream")
            r = self.client.post(f"/api/jobs/{job_id}/apply/", {"resume": bad}, format="multipart")
            self.assertEqual(r.status_code, 400)

        r = self.client.get("/api/applications/mine/")
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["job"]["title"], "Django Developer")
        r = self.client.get(f"/api/jobs/{job_id}/")
        self.assertTrue(r.data["has_applied"])

        # applicant cannot see applicants
        self.assertEqual(self.client.get(f"/api/jobs/{job_id}/applications/").status_code, 403)

        self.auth(hirer)
        r = self.client.get(f"/api/jobs/{job_id}/applications/")
        self.assertEqual(len(r.data), 1)
        app_id = r.data[0]["id"]
        d = self.client.get(f"/api/applications/{app_id}/resume/")
        self.assertEqual(d.status_code, 200)
        self.assertEqual(d["Content-Type"], "application/pdf")
        self.assertTrue(d.content.startswith(b"%PDF"))
        r = self.client.patch(f"/api/applications/{app_id}/", {"status": "shortlisted"}, format="json")
        self.assertEqual(r.data["status"], "shortlisted")
        self.assertEqual(self.client.get("/api/jobs/mine/").data[0]["applications_count"], 1)

        # another hirer cannot touch it
        other = register(self.client, "other@x.com", "hirer", company_name="X")
        self.auth(other)
        self.assertEqual(self.client.get(f"/api/applications/{app_id}/resume/").status_code, 404)
        self.client.credentials()
        self.assertEqual(self.client.get(f"/api/applications/{app_id}/resume/").status_code, 401)
        self.auth(other)
        self.assertEqual(self.client.delete(f"/api/jobs/{job_id}/").status_code, 404)
        self.assertEqual(self.client.patch(f"/api/applications/{app_id}/", {"status": "hired"}, format="json").status_code, 404)

    def test_login(self):
        register(self.client, "a@b.com", "applicant")
        self.assertEqual(self.client.post("/api/auth/login/", {"email": "A@B.com", "password": "StrongPass123"}, format="json").status_code, 200)
        self.assertEqual(self.client.post("/api/auth/login/", {"email": "a@b.com", "password": "nope"}, format="json").status_code, 401)

    def test_hirer_needs_company(self):
        r = self.client.post("/api/auth/register/", {"email": "h@h.com", "password": "StrongPass123", "role": "hirer"}, format="json")
        self.assertEqual(r.status_code, 400)


FAKE = {
    "data": [{
        "id": "1", "job_title": "React Engineer", "company": "Notion", "company_domain": "notion.so",
        "location": "Remote", "remote": True, "min_annual_salary_usd": 120000, "max_annual_salary_usd": 160000,
        "technology_slugs": ["react"], "description": "## Build things",
        "sources": [{"provider": "greenhouse", "url": "https://x.co/1"}],
    }],
    "metadata": {"next_cursor": "abc", "total": 42},
}


class ExternalTests(APITestCase):
    def setUp(self):
        cache.clear()

    @override_settings(JOBSPIPE_API_KEY="jp_live_test")
    @patch("jobs.jobspipe.requests.post")
    def test_search_uses_bearer_and_normalizes(self, post):
        post.return_value = MagicMock(ok=True, status_code=200, json=lambda: FAKE)
        r = self.client.get("/api/external/jobs/?q=react&remote=1")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["results"][0]["apply_url"], "https://x.co/1")
        self.assertEqual(r.data["next_cursor"], "abc")
        _, kwargs = post.call_args
        self.assertEqual(kwargs["headers"]["Authorization"], "Bearer jp_live_test")
        self.assertEqual(kwargs["json"]["job_title_or"], ["react"])
        self.assertNotIn("jp_live_test", str(r.content))

    @override_settings(JOBSPIPE_API_KEY="jp_live_test")
    @patch("jobs.jobspipe.requests.post")
    def test_stack(self, post):
        post.return_value = MagicMock(ok=True, status_code=200, json=lambda: {"technologies": [
            {"name": "Next.js", "category": "Framework", "confidence": 90}, {"name": "AWS", "confidence": 60}]})
        r = self.client.get("/api/external/stack/?domain=https://www.notion.so/path")
        self.assertEqual(r.data["domain"], "notion.so")
        self.assertEqual(r.data["technologies"][0]["name"], "Next.js")
        self.assertEqual(self.client.get("/api/external/stack/?domain=not_a_domain").status_code, 400)

    @override_settings(JOBSPIPE_API_KEY="jp_live_bad")
    @patch("jobs.jobspipe.requests.post")
    def test_bad_key(self, post):
        post.return_value = MagicMock(ok=False, status_code=401)
        self.assertEqual(self.client.get("/api/external/jobs/").status_code, 502)
