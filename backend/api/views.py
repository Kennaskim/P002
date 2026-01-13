from rest_framework import generics, permissions, viewsets, filters, status
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework import permissions
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Q
from .models import Textbook, Listing, BookshopProfile, SchoolProfile, BookList, Conversation, Message, Cart, CartItem, Review, SwapRequest, Order, Delivery, Payment
from .serializers import UserSerializer, RegisterSerializer, TextbookSerializer, ListingSerializer, BookshopProfileSerializer, SchoolProfileSerializer, BookListSerializer, ConversationSerializer, MessageSerializer, CartItemSerializer, CartSerializer, ReviewSerializer, SwapRequestSerializer, OrderSerializer, DeliverySerializer, PaymentSerializer
from .permissions import IsOwnerOrReadOnly
import random, string
from .utils import get_delivery_cost

User = get_user_model()

#register view
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny] # Anyone can register
    serializer_class = RegisterSerializer

#current user view
class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

#textbook viewset
class TextbookViewSet(viewsets.ModelViewSet):
    queryset = Textbook.objects.all()
    serializer_class = TextbookSerializer
    # Only logged-in users can add books, but anyone (even guests) can view them
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

#listing viewset
class ListingViewSet(viewsets.ModelViewSet):
    #CRUD for all listings
    queryset = Listing.objects.filter(is_active=True).order_by('-created_at')
    serializer_class = ListingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    # --- Search & Filter Configuration ---
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['textbook__title', 'textbook__subject', 'description']
    filterset_fields = ['listing_type', 'condition']

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.views += 1
        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(listed_by=user)

#my listings viewset for dashboard
class MyListingsView(generics.ListAPIView):
    serializer_class = ListingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Return ALL listings for this user (even inactive/sold ones)
        return Listing.objects.filter(listed_by=self.request.user).order_by('-created_at')

#bookshop profile viewset
class BookshopViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Publicly viewable list of bookshops.
    """
    queryset = BookshopProfile.objects.all().order_by('shop_name')
    serializer_class = BookshopProfileSerializer
    permission_classes = [permissions.AllowAny]
    @action(detail=True, methods=['get'])
    def inventory(self, request, pk=None):
        """
        Get all listings created by the user associated with this bookshop profile
        """
        bookshop = self.get_object()
        # Find listings created by the bookshop owner
        listings = Listing.objects.filter(listed_by=bookshop.user, is_active=True)
        serializer = ListingSerializer(listings, many=True)
        return Response(serializer.data)

#school profile viewset
class SchoolViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Publicly viewable list of schools.
    """
    queryset = SchoolProfile.objects.all().order_by('school_name')
    serializer_class = SchoolProfileSerializer
    permission_classes = [permissions.AllowAny]

#booklist viewset
class SchoolBookListsView(generics.ListAPIView):
    """
    Get all book lists for a specific school.
    """
    serializer_class = BookListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        school_id = self.kwargs['school_id']
        return BookList.objects.filter(school__id=school_id)

#conversation viewset
class ConversationListView(generics.ListAPIView):
    """
    List all conversations. 
    We NO LONGER hide duplicates because each chat is about a different book.
    """
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Simply return all my chats, ordered by latest message
        return self.request.user.conversations.all().order_by('-updated_at')

#message viewset
class MessageListView(generics.ListAPIView):
    """
    List all messages for a specific conversation.
    """
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        conversation_id = self.kwargs['conversation_id']
        return Message.objects.filter(conversation__id=conversation_id).order_by('timestamp')

#find or create conversation view        
class FindOrCreateConversationView(APIView):
    """
    Finds a chat unique to (Buyer + Seller + Specific Listing).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user_id = request.data.get('user_id')
        listing_id = request.data.get('listing_id') 

        if not user_id or not listing_id:
            return Response({"error": "user_id and listing_id are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            other_user = User.objects.get(id=user_id)
            listing = Listing.objects.get(id=listing_id)
        except (User.DoesNotExist, Listing.DoesNotExist):
            return Response({"error": "User or Listing not found."}, status=status.HTTP_404_NOT_FOUND)

        if other_user == request.user:
            return Response({"error": "Cannot create conversation with yourself."}, status=status.HTTP_400_BAD_REQUEST)

        # 👇 LOGIC CHANGE: Match User + OtherUser + Listing
        conversation = Conversation.objects.filter(
            participants=request.user
        ).filter(
            participants=other_user
        ).filter(
            listing=listing   # 
        ).first()

        if conversation:
            serializer = ConversationSerializer(conversation, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            # Create a NEW chat linked to this book
            conversation = Conversation.objects.create(listing=listing)
            conversation.participants.add(request.user, other_user)
            serializer = ConversationSerializer(conversation, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
#cart view
class CartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        serializer = CartSerializer(cart)
        return Response(serializer.data)

    def post(self, request):
        # Add item to cart
        listing_id = request.data.get('listing_id')
        cart, _ = Cart.objects.get_or_create(user=request.user)
        
        try:
            listing = Listing.objects.get(id=listing_id, is_active=True)
        except Listing.DoesNotExist:
            return Response({"error": "Listing not found"}, status=404)

        if listing.listed_by == request.user:
             return Response({"error": "Cannot buy your own book"}, status=400)

        CartItem.objects.get_or_create(cart=cart, listing=listing)
        
        # Return updated cart
        serializer = CartSerializer(cart)
        return Response(serializer.data)

    def delete(self, request):
        # Remove item from cart
        item_id = request.data.get('item_id')
        cart = Cart.objects.get(user=request.user)
        CartItem.objects.filter(cart=cart, id=item_id).delete()
        
        serializer = CartSerializer(cart)
        return Response(serializer.data)

#review view
class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        # We automatically set the reviewer (current user) 
        # and the seller (derived from the listing)
        listing = serializer.validated_data['listing']
        if listing.listed_by == self.request.user:
            raise ValidationError("You cannot review your own listing.")
            
        serializer.save(
            reviewer=self.request.user,
            seller=listing.listed_by
        )

#User reviews view
class UserReviewsView(generics.ListAPIView):
    """
    Get all reviews for a specific user (seller)
    """
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user_id = self.kwargs['user_id']
        return Review.objects.filter(seller__id=user_id).order_by('-created_at')

#Allowa schools to manage their booklists
class MyBookListsView(viewsets.ModelViewSet):
    serializer_class = BookListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only return lists belonging to this school
        if hasattr(self.request.user, 'school_profile'):
            return BookList.objects.filter(school=self.request.user.school_profile)
        return BookList.objects.none()

    def perform_create(self, serializer):
        # Link new list to the school profile
        if not hasattr(self.request.user, 'school_profile'):
             raise ValidationError("You must be a School Account to create book lists.")
        serializer.save(school=self.request.user.school_profile)

    @action(detail=True, methods=['post'])
    def create_and_add_book(self, request, pk=None):
        book_list = self.get_object()
        
        # Get data from the form
        title = request.data.get('title')
        author = request.data.get('author', '')
        subject = request.data.get('subject')
        grade = request.data.get('grade')

        if not title or not subject:
            return Response({'error': 'Title and Subject are required'}, status=400)

        # Create or Get the Textbook
        try:
            textbook, created = Textbook.objects.get_or_create(
                title__iexact=title, 
                subject__iexact=subject,
                defaults={
                    'title': title,
                    'author': author, 
                    'subject': subject,
                    'grade': grade or book_list.grade
                }
            )
            
            # Add to list
            book_list.textbooks.add(textbook)
            
            return Response({'status': 'Book added', 'book': TextbookSerializer(textbook).data})
        except Exception as e:
            return Response({'error': str(e)}, status=400)

    # Remove a book from the list
    @action(detail=True, methods=['post'])
    def remove_book(self, request, pk=None):
        book_list = self.get_object()
        textbook_id = request.data.get('textbook_id')
        
        try:
            textbook = Textbook.objects.get(id=textbook_id)
            book_list.textbooks.remove(textbook)
            return Response({'status': 'book removed'})
        except Textbook.DoesNotExist:
            return Response({'error': 'Textbook not found'}, status=404)

#Allows Schools abd bookshops to udate their profiles
class MyProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        data = UserSerializer(user).data
        
        # Append specific profile data
        if user.user_type == 'school' and hasattr(user, 'school_profile'):
            data['profile'] = SchoolProfileSerializer(user.school_profile).data
        elif user.user_type == 'bookshop' and hasattr(user, 'bookshop_profile'):
            data['profile'] = BookshopProfileSerializer(user.bookshop_profile).data
            
        return Response(data)

    def patch(self, request):
        user = request.user
        # Handle updating the specific profile table based on user type
        if user.user_type == 'school':
            profile, created = SchoolProfile.objects.get_or_create(user=user)
            serializer = SchoolProfileSerializer(profile, data=request.data, partial=True)
        elif user.user_type == 'bookshop':
            profile, created = BookshopProfile.objects.get_or_create(user=user)
            serializer = BookshopProfileSerializer(profile, data=request.data, partial=True)
        else:
            return Response({"error": "Profile editing not available for this user type"}, status=400)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

# Swapping viewset
class SwapRequestViewSet(viewsets.ModelViewSet):
    serializer_class = SwapRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users can see swaps they sent OR received
        return SwapRequest.objects.filter(
            Q(sender=self.request.user) | Q(receiver=self.request.user)
        ).order_by('-created_at')

    def perform_create(self, serializer):
        # Automatically set sender and receiver
        requested_listing = serializer.validated_data['requested_listing']
        
        # Validation: You can't swap with yourself
        if requested_listing.listed_by == self.request.user:
            raise ValidationError("You cannot swap with yourself.")
            
        serializer.save(
            sender=self.request.user,
            receiver=requested_listing.listed_by
        )

    # Action to ACCEPT a swap
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        swap = self.get_object()
        
        if request.user != swap.receiver:
            return Response({'error': 'Not authorized'}, status=403)
            
        swap.status = 'accepted'
        swap.save()
        
        # 1. AUTO-CLOSE: Mark both listings as "Sold" (Inactive)
        if swap.requested_listing:
            swap.requested_listing.is_active = False
            swap.requested_listing.save()
            
        if swap.offered_listing:
            swap.offered_listing.is_active = False
            swap.offered_listing.save()

        Delivery.objects.create(
        swap=swap,
        pickup_location=swap.sender.location,  
        dropoff_location=swap.receiver.location, 
        transport_cost=250.00,
        status='pending'
    )
        
        # 2. AUTO-CHAT: Create or Get conversation linked to the requested book
        conversation = Conversation.objects.filter(
            participants=swap.sender
        ).filter(
            participants=swap.receiver
        ).filter(
            listing=swap.requested_listing
        ).first()

        if not conversation:
            conversation = Conversation.objects.create(listing=swap.requested_listing)
            conversation.participants.add(swap.sender, swap.receiver)
            
       
        Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=f"Hi! I have accepted your swap offer for {swap.requested_listing.textbook.title}. When can we meet?"
        )
        
        
        return Response({
            'status': 'Swap Accepted', 
            'conversation_id': conversation.id 
        })

    # Action to REJECT a swap
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        swap = self.get_object()
        if request.user != swap.receiver:
            return Response({'error': 'Not authorized'}, status=403)
            
        swap.status = 'rejected'
        swap.save()
        return Response({'status': 'Swap Rejected'})

# Delivery viewset
class DeliveryViewSet(viewsets.ModelViewSet):
    queryset = Delivery.objects.all()
    serializer_class = DeliverySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.query_params.get('view') == 'rider':
            return Delivery.objects.filter(status__in=['paid', 'shipped']).order_by('-created_at')
        # Users see deliveries where they are Sender, Receiver, or Buyer
        return Delivery.objects.filter(
            Q(order__buyer=self.request.user) | 
            Q(swap__sender=self.request.user) | 
            Q(swap__receiver=self.request.user)
        ).order_by('-created_at')
    # Rider Accepts a Job
    @action(detail=True, methods=['post'])
    def accept_job(self, request, pk=None):
        delivery = self.get_object()
        # Change status to 'shipped' (In Transit)
        delivery.status = 'shipped'
        delivery.rider_phone = request.user.phone_number or "0700000000" # Save Rider's number
        delivery.save()
        
        return Response({'status': 'Job Accepted', 'tracking_code': delivery.tracking_code})

    # Rider Completes a Job
    @action(detail=True, methods=['post'])
    def complete_job(self, request, pk=None):
        delivery = self.get_object()
        
        delivery.status = 'delivered'
        delivery.save()
        
        return Response({'status': 'Job Completed'})
    

# Order viewset
class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        listing_id = request.data.get('listing_id')
        listing = Listing.objects.get(id=listing_id)

        # 1. Create Order
        order = Order.objects.create(
            buyer=request.user,
            listing=listing,
            amount_paid=listing.price
        )

        # 2. Mark item as sold
        listing.is_active = False
        listing.save()

        # 3. Create Delivery
        Delivery.objects.create(
            order=order,
            pickup_location=listing.listed_by.location,
            dropoff_location=request.user.location,
            transport_cost=0.00,
            status='pending'
        )

        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

# Payment viewset
class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def initiate_mpesa(self, request):
        """ Simulate M-Pesa Payment """
        delivery_id = request.data.get('delivery_id')
        phone = request.data.get('phone_number')

        try:
            delivery = Delivery.objects.get(id=delivery_id)
        except Delivery.DoesNotExist:
            return Response({'error': 'Delivery not found'}, status=404)

        # 1. Create Payment Record
        payment = Payment.objects.create(
            user=request.user,
            delivery=delivery,
            phone_number=phone,
            amount=delivery.transport_cost,
            is_successful=True, 
            transaction_code=''.join(random.choices(string.ascii_uppercase + string.digits, k=10))
        )

        # 2. Update Delivery Status
        delivery.status = 'paid'
        delivery.tracking_code = f"TRK-{random.randint(1000, 9999)}"
        delivery.save()

        return Response({
            'status': 'Payment Successful',
            'transaction_code': payment.transaction_code,
            'tracking_code': delivery.tracking_code
        })

# Calculate delivery fee
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def calculate_delivery_fee(request):
    """
    Calculates the delivery fee before the user pays.
    Expected JSON: { "pickup": "Dedan Kimathi", "dropoff": "Nyeri Town" }
    """
    pickup = request.data.get('pickup')
    dropoff = request.data.get('dropoff')

    if not pickup or not dropoff:
        return Response({'error': 'Both addresses are required'}, status=400)

    cost, distance, pickup_coords, dropoff_coords, route_geometry, error = get_delivery_cost(pickup, dropoff)

    if error:
        return Response({'error': error}, status=400)

    return Response({
        'delivery_fee': cost,
        'distance': distance,
        'pickup_coords': pickup_coords,
        'dropoff_coords': dropoff_coords,
        'route_geometry': route_geometry,
        'message': f"Distance: {distance}. Cost: KSh {cost}"
    })