from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ApplicationStatusView, ExternalJobsView, JobViewSet, MyApplicationsView, ResumeDownloadView, StackScanView

router = DefaultRouter()
router.register("jobs", JobViewSet, basename="job")

urlpatterns = [
    path("external/jobs/", ExternalJobsView.as_view()),
    path("external/stack/", StackScanView.as_view()),
    path("applications/mine/", MyApplicationsView.as_view()),
    path("applications/<int:pk>/", ApplicationStatusView.as_view()),
    path("applications/<int:pk>/resume/", ResumeDownloadView.as_view()),
    path("", include(router.urls)),
]
