import os

from django.db.models import Count, Q
from django.http import Http404, HttpResponse
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from . import jobspipe
from .models import Application, Job
from .permissions import IsApplicant, IsHirer
from .serializers import (
    ApplicationStatusSerializer, ApplyInputSerializer, JobApplicationSerializer,
    JobSerializer, MyApplicationSerializer,
)


RESUME_TYPES = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


class JobViewSet(viewsets.ModelViewSet):
    serializer_class = JobSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        if self.action == "apply":
            return [IsAuthenticated(), IsApplicant()]
        return [IsAuthenticated(), IsHirer()]

    def get_queryset(self):
        qs = Job.objects.annotate(applications_count=Count("applications")).order_by("-created_at")
        user = self.request.user
        params = self.request.query_params

        if self.action == "list":
            qs = qs.filter(is_active=True)
            if q := params.get("q", "").strip():
                qs = qs.filter(Q(title__icontains=q) | Q(company_name__icontains=q) | Q(description__icontains=q))
            if loc := params.get("location", "").strip():
                qs = qs.filter(location__icontains=loc)
            if mode := params.get("work_mode"):
                qs = qs.filter(work_mode=mode)
            if jtype := params.get("job_type"):
                qs = qs.filter(job_type=jtype)
            return qs
        if self.action in ("retrieve",):
            owner = Q(hirer=user) if user.is_authenticated else Q(pk__in=[])
            return qs.filter(Q(is_active=True) | owner)
        if self.action == "apply":
            return qs.filter(is_active=True)
        return qs.filter(hirer=user)  # update, destroy, applications

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(hirer=user, company_name=serializer.validated_data.get("company_name") or user.company_name)

    @action(detail=False, methods=["get"])
    def mine(self, request):
        qs = self.get_queryset_for_hirer(request)
        return Response(self.get_serializer(qs, many=True).data)

    def get_queryset_for_hirer(self, request):
        return Job.objects.filter(hirer=request.user).annotate(applications_count=Count("applications")).order_by("-created_at")

    @action(detail=True, methods=["get"])
    def applications(self, request, pk=None):
        job = self.get_object()
        qs = Application.objects.filter(job=job).select_related("applicant")
        return Response(JobApplicationSerializer(qs, many=True, context={"request": request}).data)

    @action(detail=True, methods=["post"], parser_classes=[MultiPartParser, FormParser])
    def apply(self, request, pk=None):
        job = self.get_object()
        if Application.objects.filter(job=job, applicant=request.user).exists():
            return Response({"detail": "You have already applied to this job."}, status=status.HTTP_400_BAD_REQUEST)
        data = ApplyInputSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        f = data.validated_data["resume"]
        ext = os.path.splitext(f.name)[1].lower()
        application = Application.objects.create(
            job=job,
            applicant=request.user,
            cover_letter=data.validated_data.get("cover_letter", ""),
            resume_name=os.path.basename(f.name)[:200],
            resume_type=RESUME_TYPES[ext],
            resume_data=f.read(),
        )
        return Response(MyApplicationSerializer(application).data, status=status.HTTP_201_CREATED)


class MyApplicationsView(generics.ListAPIView):
    serializer_class = MyApplicationSerializer
    permission_classes = [IsAuthenticated, IsApplicant]
    pagination_class = None

    def get_queryset(self):
        return Application.objects.filter(applicant=self.request.user).select_related("job")


class ApplicationStatusView(generics.UpdateAPIView):
    serializer_class = ApplicationStatusSerializer
    permission_classes = [IsAuthenticated, IsHirer]
    http_method_names = ["patch"]

    def get_queryset(self):
        return Application.objects.filter(job__hirer=self.request.user)


class ResumeDownloadView(APIView):
    """Resumes are private: only the applicant and the job's hirer can download one."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        app = Application.objects.select_related("job").filter(pk=pk).first()
        if not app or request.user.id not in (app.applicant_id, app.job.hirer_id):
            raise Http404
        resp = HttpResponse(bytes(app.resume_data), content_type=app.resume_type)
        resp["Content-Disposition"] = f'attachment; filename="{app.resume_name}"'
        resp["X-Content-Type-Options"] = "nosniff"
        return resp


class _ExternalView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "external"


class ExternalJobsView(_ExternalView):
    def get(self, request):
        p = request.query_params
        try:
            data = jobspipe.search_jobs(
                q=p.get("q", "").strip()[:100],
                location=p.get("location", "").strip()[:100],
                country=p.get("country", "").strip()[:2],
                remote=p.get("remote") in ("1", "true", "True"),
                cursor=p.get("cursor", ""),
                limit=p.get("limit", 10),
            )
        except jobspipe.JobsPipeError as e:
            return Response({"detail": e.message}, status=e.status)
        return Response(data)


class StackScanView(_ExternalView):
    def get(self, request):
        domain = jobspipe.valid_domain(request.query_params.get("domain"))
        if not domain:
            return Response({"detail": "Enter a valid company domain, like notion.so."}, status=400)
        try:
            return Response(jobspipe.scan_stack(domain))
        except jobspipe.JobsPipeError as e:
            return Response({"detail": e.message}, status=e.status)
