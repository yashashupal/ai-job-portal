from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ApplicationStatusView, ExternalJobsView, ExternalTrackedJobDetailView, ExternalTrackedJobsView,
    JobViewSet, MyApplicationsView, RecommendedExternalJobsView, ResumeDownloadView, StackScanView,
)

router = DefaultRouter()
router.register("jobs", JobViewSet, basename="job")

urlpatterns = [
    path("external/jobs/recommended/", RecommendedExternalJobsView.as_view()),
    path("external/jobs/", ExternalJobsView.as_view()),
    path("external/tracked/", ExternalTrackedJobsView.as_view()),
    path("external/tracked/<int:pk>/", ExternalTrackedJobDetailView.as_view()),
    path("external/stack/", StackScanView.as_view()),
    path("applications/mine/", MyApplicationsView.as_view()),
    path("applications/<int:pk>/", ApplicationStatusView.as_view()),
    path("applications/<int:pk>/resume/", ResumeDownloadView.as_view()),
    path("", include(router.urls)),
]
