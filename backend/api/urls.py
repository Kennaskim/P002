from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,  
    TokenRefreshView,            
)
from .views import RegisterView, CurrentUserView, TextbookViewSet, ListingViewSet, BookshopViewSet, SchoolViewSet, SchoolBookListsView, ConversationListView, MessageListView, FindOrCreateConversationView, CartView, ReviewViewSet, UserReviewsView, MyListingsView, MyBookListsView, MyProfileView, SwapRequestViewSet
#router
router = DefaultRouter()
#register viewsets
router.register(r'textbooks', TextbookViewSet, basename='textbook')
router.register(r'listings', ListingViewSet, basename='listing')
router.register(r'bookshops', BookshopViewSet, basename='bookshop')
router.register(r'schools', SchoolViewSet, basename='school')
router.register(r'reviews', ReviewViewSet, basename='review')
router.register(r'my-booklists', MyBookListsView, basename='my-booklists')
router.register(r'swaps', SwapRequestViewSet, basename='swap')
urlpatterns = [
    path('', include(router.urls)),
    path('schools/<int:school_id>/booklists/', SchoolBookListsView.as_view(), name='school_book_lists'),
    # Auth endpoints
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/me/', CurrentUserView.as_view(), name='current_user'),
    path('conversations/', ConversationListView.as_view(), name='conversations'),
    path('conversations/<int:conversation_id>/messages/', MessageListView.as_view(), name='messages'),
    path('conversations/find_or_create/', FindOrCreateConversationView.as_view(), name='find_conversation'),
    path('cart/', CartView.as_view(), name='cart'),
    path('users/<int:user_id>/reviews/', UserReviewsView.as_view(), name='user_reviews'),
    path('my-listings/', MyListingsView.as_view(), name='my_listings'),
    path('my-profile/', MyProfileView.as_view(), name='my-profile'),
    path('password_reset/', include('django_rest_passwordreset.urls', namespace='password_reset')),
]