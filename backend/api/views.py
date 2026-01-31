from rest_framework import generics, permissions, viewsets, filters, status
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import action, api_view, permission_classes
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Q
from django.utils import timezone
from django.db import transaction
from .models import Textbook, Listing, BookshopProfile, SchoolProfile, BookList, Conversation, Message, Cart, CartItem, Review, SwapRequest, Order, Delivery, Payment
from .serializers import UserSerializer, RegisterSerializer, TextbookSerializer, ListingSerializer, BookshopProfileSerializer, SchoolProfileSerializer, BookListSerializer, ConversationSerializer, MessageSerializer, CartItemSerializer, CartSerializer, ReviewSerializer, SwapRequestSerializer, OrderSerializer, DeliverySerializer, PaymentSerializer
from .permissions import IsOwnerOrReadOnly
import random, string, csv, io, openpyxl
from .utils import get_delivery_cost
from .mpesa_utils import trigger_stk_push

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

    @action(detail=False, methods=['post'])
    def bulk_upload(self, request):
        file = request.FILES.get('file')
        if not file: return Response({'error': 'No file'}, status=400)
        
        try:
            # ... (Your CSV reading logic here) ...
            
            for row in reader:
                title = row.get('title')
                if not title: continue

                # Try to find an existing textbook with this title (case-insensitive)
                # If found, it uses the existing image!
                textbook, created = Textbook.objects.get_or_create(
                    title__iexact=title,
                    defaults={
                        'title': title,
                        'author': row.get('author', 'Unknown'),
                        'subject': row.get('subject', 'General'),
                        'grade': 'General'
                    }
                )

                # 2. Create the Listing
                Listing.objects.create(
                    listed_by=request.user,
                    textbook=textbook,
                    listing_type='sell',
                    condition='new', 
                    price=row.get('price', 0),
                    description="In stock at bookshop"
                )
            
            return Response({'status': 'Inventory Imported Successfully'})

        except Exception as e:
            return Response({'error': str(e)}, status=400)

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
class BookListViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Handles operations on specific BookLists 
    """
    queryset = BookList.objects.all()
    serializer_class = BookListSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=['get'])
    def check_availability(self, request, pk=None):
        book_list = self.get_object()
        results = []
        
        for textbook in book_list.textbooks.all():
            # Find cheapest active listing for this book
            listing = Listing.objects.filter(textbook=textbook, is_active=True).order_by('price').first()
            
            results.append({
                'textbook_title': textbook.title,
                'is_available': True if listing else False,
                'best_price': listing.price if listing else 0,
                'listing_id': listing.id if listing else None
            })
            
        return Response(results)
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

    @action(detail=True, methods=['get'])
    def check_availability(self, request, pk=None):
        book_list = self.get_object()
        results = []
        
        for textbook in book_list.textbooks.all():
            # Find cheapest active listing for this book
            listing = Listing.objects.filter(textbook=textbook, is_active=True).order_by('price').first()
            
            results.append({
                'textbook_title': textbook.title,
                'is_available': listing,
                'best_price': listing.price if listing else 0,
                'listing_id': listing.id if listing else None
            })
            
        return Response(results)

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
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user_id = request.data.get('user_id')
        listing_id = request.data.get('listing_id') 

        if not user_id:
            return Response({"error": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            other_user = User.objects.get(id=user_id)
            # Listing is optional for finding the chat, but needed if creating new
            listing = Listing.objects.get(id=listing_id) if listing_id else None
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if other_user == request.user:
            return Response({"error": "Cannot create conversation with yourself."}, status=status.HTTP_400_BAD_REQUEST)

        # --- FIX: Find ANY existing chat between these two users ---
        conversation = Conversation.objects.filter(participants=request.user)\
            .filter(participants=other_user).first()

        if conversation:
            # If chat exists, just return it (Reuse it)
            # Optional: Update the 'listing' field to the newest topic if you want
            if listing:
                conversation.listing = listing
                conversation.save()
            
            serializer = ConversationSerializer(conversation, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            # Only create NEW if none exists
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
    def upload_csv(self, request, pk=None):
        book_list = self.get_object()
        file = request.FILES.get('file')

        if not file:
            return Response({'error': 'No file uploaded'}, status=400)

        added_count = 0
        
        try:
            if file.name.endswith('.xlsx'):
                wb = openpyxl.load_workbook(file)
                sheet = wb.active
                
                headers = [str(cell.value).strip().lower() for cell in sheet[1] if cell.value]
                
                for row in sheet.iter_rows(min_row=2, values_only=True):
                    row_data = dict(zip(headers, row))
                    
                    title = row_data.get('title')
                    if not title: continue

                    author = row_data.get('author') or ''
                    subject = row_data.get('subject') or 'General'
                    
                    textbook, _ = Textbook.objects.get_or_create(
                        title__iexact=title,
                        defaults={
                            'title': title,
                            'author': author,
                            'subject': subject,
                            'grade': book_list.grade
                        }
                    )
                    book_list.textbooks.add(textbook)
                    added_count += 1

            elif file.name.endswith('.csv'):
                try:
                    decoded_file = file.read().decode('utf-8-sig')
                except UnicodeDecodeError:
                    file.seek(0)
                    decoded_file = file.read().decode('latin-1')

                io_string = io.StringIO(decoded_file)
                reader = csv.DictReader(io_string)
                
                if reader.fieldnames:
                    reader.fieldnames = [name.strip().lower() for name in reader.fieldnames]

                for row in reader:
                    title = row.get('title')
                    if not title: continue
                    
                    textbook, _ = Textbook.objects.get_or_create(
                        title__iexact=title,
                        defaults={
                            'title': title,
                            'author': row.get('author', ''),
                            'subject': row.get('subject', 'General'),
                            'grade': book_list.grade
                        }
                    )
                    book_list.textbooks.add(textbook)
                    added_count += 1
            
            else:
                return Response({'error': 'Unsupported file type. Use .csv or .xlsx'}, status=400)

            return Response({'status': f'Successfully added {added_count} books'})
            
        except Exception as e:
            print(f"Upload Error: {e}") 
            return Response({'error': f"File Error: {str(e)}"}, status=400)

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
        
        # Append specific profile data if it exists
        if user.user_type == 'school' and hasattr(user, 'school_profile'):
            data['profile'] = SchoolProfileSerializer(user.school_profile).data
        elif user.user_type == 'bookshop' and hasattr(user, 'bookshop_profile'):
            data['profile'] = BookshopProfileSerializer(user.bookshop_profile).data
            
        return Response(data)

    def patch(self, request):
        user = request.user
        
        # 1. Update Core User Fields (Phone, Location, etc.)
        user_serializer = UserSerializer(user, data=request.data, partial=True)
        if user_serializer.is_valid():
            user_serializer.save()
        else:
            return Response(user_serializer.errors, status=400)

        # 2. Update Specific Profile Fields (if applicable)
        if user.user_type == 'school':
            profile, _ = SchoolProfile.objects.get_or_create(user=user)
            profile_serializer = SchoolProfileSerializer(profile, data=request.data, partial=True)
            if profile_serializer.is_valid():
                profile_serializer.save()
        
        elif user.user_type == 'bookshop':
            profile, _ = BookshopProfile.objects.get_or_create(user=user)
            profile_serializer = BookshopProfileSerializer(profile, data=request.data, partial=True)
            if profile_serializer.is_valid():
                profile_serializer.save()

        # Return the fresh, updated user data
        return Response(UserSerializer(user).data)

# Swapping viewset
class SwapRequestViewSet(viewsets.ModelViewSet):
    serializer_class = SwapRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users can see swaps they sent OR received
        return SwapRequest.objects.filter(
            Q(sender=self.request.user) | Q(receiver=self.request.user)
        ).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        req_id = request.data.get('requested_listing_id')
        off_id = request.data.get('offered_listing_id')

        # 1. Check if a swap entry already exists for these two books
        existing_swap = SwapRequest.objects.filter(
            requested_listing_id=req_id,
            offered_listing_id=off_id
        ).first()

        # 2. If it exists...
        if existing_swap:
            # If the old one is (cancelled or rejected), delete it so we can try again
            if existing_swap.status in ['cancelled', 'rejected']:
                existing_swap.delete()
            # If it's still (pending or accepted), block the new request
            else:
                return Response(
                    {'error': 'An active swap request already exists for these books.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

        # 3. Proceed with normal creation
        return super().create(request, *args, **kwargs)

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
        
        # 1. AUTO-CLOSE listings
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
            transport_cost=0.00,
            status='pending'
        )
        
        # 2. AUTO-CHAT: Find ANY conversation between Sender and Receiver
        conversation = Conversation.objects.filter(participants=swap.sender)\
            .filter(participants=swap.receiver).first()

        if not conversation:
            conversation = Conversation.objects.create(listing=swap.requested_listing)
            conversation.participants.add(swap.sender, swap.receiver)
        else:
            # Update context to this swap
            conversation.listing = swap.requested_listing
            conversation.save()
       
        Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=f"✅ SYSTEM: I have accepted your swap offer for '{swap.requested_listing.textbook.title}'."
        )
        
        return Response({'status': 'Swap Accepted', 'conversation_id': conversation.id})

    # Action to REJECT a swap
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        swap = self.get_object()
        if request.user != swap.receiver:
            return Response({'error': 'Not authorized'}, status=403)
            
        swap.status = 'rejected'
        swap.save()
        
        if swap.requested_listing:
            swap.requested_listing.is_active = True
            swap.requested_listing.save()
        if swap.offered_listing:
            swap.offered_listing.is_active = True
            swap.offered_listing.save()

        # Notification
        sender = swap.sender
        receiver = request.user 
        
        # Find ANY conversation
        conversation = Conversation.objects.filter(participants=sender)\
            .filter(participants=receiver).first()
            
        if not conversation:
            conversation = Conversation.objects.create(listing=swap.requested_listing)
            conversation.participants.add(sender, receiver)

        Message.objects.create(
            conversation=conversation,
            sender=receiver,
            content=f"🚫 SYSTEM: I have rejected the swap offer for '{swap.requested_listing.textbook.title}'."
        )
        return Response({'status': 'Swap Rejected'})

# Delivery viewset
class DeliveryViewSet(viewsets.ModelViewSet):
    queryset = Delivery.objects.all()
    serializer_class = DeliverySerializer
    permission_classes = [permissions.IsAuthenticated]
    

    def get_queryset(self):
        user = self.request.user

        if user.user_type == 'rider':
            rider_phone = user.phone_number or ""
            return Delivery.objects.filter(
                Q(status='paid') | 
                Q(rider_phone=user.phone_number)
            ).order_by('-created_at')

        return Delivery.objects.filter(
            Q(orders__buyer=user) | 
            Q(orders__listing__listed_by=user) |
            Q(swap__sender=user) | 
            Q(swap__receiver=user)
        ).order_by('-created_at').distinct().order_by('-created_at')
    # Rider Accepts a Job
    @action(detail=True, methods=['post'])
    def accept_job(self, request, pk=None):
        delivery = self.get_object()
        user = request.user
        active_job = Delivery.objects.filter(rider_phone=user.phone_number, status='shipped').exists()
        
        if active_job:
            return Response({'error': '⛔ You have an unfinished delivery! Complete it first.'}, status=400)
        
        # 2. Validation: Prevent taking a taken job
        if delivery.status != 'paid':
            return Response({'error': 'Job is no longer available.'}, status=400)
        # Change status to 'shipped' (In Transit)
        delivery.status = 'shipped'
        delivery.rider = user
        delivery.rider_phone = user.phone_number
        delivery.save()
        
        customer = None
        if delivery.orders.exists():
            customer = delivery.orders.first().buyer
        elif delivery.swap:
            # For swaps, the proposer (sender) is usually the one tracking/paying
            customer = delivery.swap.sender
        
        if customer:
            # Check if chat already exists for this delivery
            conversation, created = Conversation.objects.get_or_create(
                delivery=delivery,
                defaults={'listing': None} 
            )
            # Ensure both are participants
            conversation.participants.add(user, customer)
        return Response({'status': 'Job Accepted', 'tracking_code': delivery.tracking_code, 'delivery': DeliverySerializer(delivery).data})

    
    #update riders location
    @action(detail=True, methods=['post'])
    def update_location(self, request, pk=None):
        delivery = self.get_object()  
        lat = request.data.get('lat')
        lng = request.data.get('lng')
        
        if lat is not None and lng is not None:
            delivery.current_lat = float(lat)
            delivery.current_lng = float(lng)
            delivery.updated_at = timezone.now()
            delivery.save()
            return Response({'status': 'Location Updated'})
        return Response({'error': 'Invalid Coordinates'}, status=400)

    # Rider Completes a Job
    @action(detail=True, methods=['post'])
    def complete_job(self, request, pk=None):
        delivery = self.get_object()
        delivery.status = 'delivered'
        delivery.save()  
        return Response({'status': 'Job Completed'})

    # User cancel a order
    @action(detail=True, methods=['post'])
    def cancel_order(self, request, pk=None):
        delivery = self.get_object()
        buyer = request.user
        
        if delivery.status in ['shipped', 'delivered']:
            return Response({'error': 'Cannot cancel order that is already in transit.'}, status=400)
            
        delivery.status = 'cancelled'
        delivery.save()
        
        # Scenario A: Multiple Orders (purchase)
        if delivery.orders.exists():
            # Loop through ALL orders in this delivery and restock them
            for order in delivery.orders.all():
                order.listing.is_active = True # Restock
                order.listing.save()
            
            # Notify Seller (Using first Order to find seller)
            first_order = delivery.orders.first()
            seller = first_order.listing.listed_by
            
            conversation = Conversation.objects.filter(participants=buyer)\
                .filter(participants=seller)\
                .filter(listing=first_order.listing).first()
            
            if conversation:
                Message.objects.create(
                    conversation=conversation,
                    sender=buyer,
                    content=f"🚫 SYSTEM: I have cancelled the delivery for {delivery.orders.count()} books. They have been returned to your inventory."
                )

        # --- SCENARIO B: SWAP (Logic remains the same) ---
        elif delivery.swap:
            swap = delivery.swap
            swap.status = 'cancelled'
            swap.save()

            if swap.requested_listing:
                swap.requested_listing.is_active = True
                swap.requested_listing.save()
            if swap.offered_listing:
                swap.offered_listing.is_active = True
                swap.offered_listing.save()
                
            other_party = swap.receiver if request.user == swap.sender else swap.sender
            
            conversation = Conversation.objects.filter(participants=buyer)\
                .filter(participants=other_party)\
                .filter(listing=swap.requested_listing).first()

            if conversation:
                Message.objects.create(
                    conversation=conversation,
                    sender=buyer,
                    content=f"🚫 SYSTEM: I have cancelled the swap delivery."
                )
            
        return Response({'status': 'Delivery Cancelled and Items Restocked'})
    

# Order viewset
class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        listing_ids = request.data.get('listing_ids', [])
        if not listing_ids:
            return Response({'error': 'No books selected'}, status=400)

        # 1. Validation
        listings = Listing.objects.filter(id__in=listing_ids, is_active=True)
        if len(listings) != len(listing_ids):
             return Response({'error': 'One or more books have already been sold. Please clear your cart and try again.'}, status=400)

        # 2. Group by Seller
        seller_groups = {}
        for listing in listings:
            seller_id = listing.listed_by.id
            if seller_id not in seller_groups:
                seller_groups[seller_id] = []
            seller_groups[seller_id].append(listing)

        created_count = 0

        # 3. Process Orders Atomically
        try:
            with transaction.atomic():
                for seller_id, group_listings in seller_groups.items():
                    seller = group_listings[0].listed_by
                    
                    # Create Delivery Container
                    delivery = Delivery.objects.create(
                        pickup_location=seller.location,
                        dropoff_location=request.user.location,
                        transport_cost=0.00, 
                        status='pending'
                    )

                    book_titles = []
                    for listing in group_listings:
                        # A. Create Order
                        order = Order.objects.create(
                            buyer=request.user,
                            listing=listing,
                            amount_paid=listing.price
                        )
                        # B. Mark as Sold
                        listing.is_active = False 
                        listing.save()
                        
                        # C. Link to Delivery
                        delivery.orders.add(order)
                        book_titles.append(listing.textbook.title)
                        created_count += 1
                        
                        # D. Remove from Cart
                        CartItem.objects.filter(cart__user=request.user, listing=listing).delete()

                    # --- FIX: SEND MESSAGE TO EXISTING CHAT ---
                    titles_str = ", ".join(book_titles)
                    
                    # Find existing conversation regardless of which book it was about
                    conversation = Conversation.objects.filter(participants=request.user)\
                        .filter(participants=seller).first()
                    
                    if not conversation:
                        conversation = Conversation.objects.create(listing=group_listings[0])
                        conversation.participants.add(request.user, seller)
                    else:
                        # Update the conversation topic to the new book
                        conversation.listing = group_listings[0]
                        conversation.save()
                    
                    Message.objects.create(
                        conversation=conversation,
                        sender=request.user,
                        content=f"🔔 SYSTEM: I have purchased {len(group_listings)} books: {titles_str}. They are grouped in one delivery!"
                    )

        except Exception as e:
            return Response({'error': str(e)}, status=500)

        return Response({'status': 'Orders Placed', 'count': created_count}, status=status.HTTP_201_CREATED)


# Payment viewset
class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def initiate_mpesa(self, request):
        """ Real M-Pesa STK Push Integration """
        delivery_id = request.data.get('delivery_id')
        phone = request.data.get('phone_number')

        try:
            delivery = Delivery.objects.get(id=delivery_id)
        except Delivery.DoesNotExist:
            return Response({'error': 'Delivery not found'}, status=404)

        
        books_total = sum(order.amount_paid for order in delivery.orders.all())
        
        # 2. Add Transport Cost
        total_amount = books_total + delivery.transport_cost
        # -----------------------------------------------

        # 3. Trigger STK Push with TOTAL AMOUNT
        response = trigger_stk_push(phone, total_amount, delivery.id)
        
        if 'ResponseCode' in response and response['ResponseCode'] == '0':
            # Success! Safaricom accepted it.
            payment = Payment.objects.create(
                user=request.user,
                delivery=delivery,
                phone_number=phone,
                amount=total_amount, # Save the full amount
                is_successful=False, 
                transaction_code=response.get('CheckoutRequestID')
            )
            
            # --- SIMULATION AUTO-COMPLETE (Remove in Production) ---
            payment.is_successful = True
            payment.save()
            delivery.status = 'paid'
            delivery.tracking_code = f"TRK-{random.randint(1000, 9999)}"
            delivery.save()
            # -----------------------------------------------------

            return Response({
                'status': 'STK Push Sent. Check your phone.',
                'checkout_id': response.get('CheckoutRequestID'),
                'tracking_code': delivery.tracking_code,
                'amount': total_amount 
            })
        else:
            error_message = response.get('errorMessage', 'M-Pesa Connection Failed')
            return Response({'error': error_message, 'details': response}, status=400)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny]) # AllowAny is crucial so Safaricom can access it
    def callback(self, request):
        """
        Receives the payment confirmation from Safaricom (M-Pesa).
        """
        data = request.data
        
        # 1. Extract the Result Code (0 = Success, others = Fail)
        body = data.get('Body', {}).get('stkCallback', {})
        result_code = body.get('ResultCode')
        checkout_id = body.get('CheckoutRequestID')

        if not checkout_id:
            return Response({'status': 'Invalid Data'}, status=400)

        try:
            # Find the pending payment
            payment = Payment.objects.get(transaction_code=checkout_id)
            delivery = payment.delivery
            
            if result_code == 0:
                # --- PAYMENT SUCCESSFUL ---
                payment.is_successful = True
                payment.save()
                
                delivery.status = 'paid'
                # Generate real tracking code now if you like
                delivery.tracking_code = f"TRK-{random.randint(1000, 9999)}"
                delivery.save()
                
                print(f"✅ Payment Confirmed for Order {delivery.id}")
            else:
                # --- PAYMENT CANCELLED/FAILED ---
                print(f"❌ Payment Failed for Order {delivery.id}: {body.get('ResultDesc')}")
                # You could optionally cancel the delivery here or leave it pending
        
        except Payment.DoesNotExist:
            print("Payment record not found for this callback")

        # Always return 200 OK to Safaricom so they stop sending the message
        return Response({'status': 'Callback Received'})
        

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
    is_swap = request.data.get('is_swap', False)

    if not pickup or not dropoff:
        return Response({'error': 'Both addresses are required'}, status=400)

    cost, distance, pickup_coords, dropoff_coords, route_geometry, error = get_delivery_cost(pickup, dropoff, is_swap)

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


# Rider Earnings
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def rider_earnings(request):
    if request.user.user_type != 'rider':
        return Response({'error': 'Unauthorized'}, status=403)
    
    # Calculate totals
    total_earnings = Delivery.objects.filter(rider=request.user, status='delivered').aggregate(Sum('transport_cost'))['transport_cost__sum'] or 0
    
    # Get recent transactions (completed deliveries)
    recent_jobs = Delivery.objects.filter(rider=request.user, status='delivered').order_by('-delivered_at')[:10]
    serializer = DeliverySerializer(recent_jobs, many=True)
    
    return Response({
        'balance': total_earnings, # Simplified for demo (Total = Balance)
        'total_jobs': recent_jobs.count(),
        'history': serializer.data
    })

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def request_withdrawal(request):
    amount = request.data.get('amount')
    # Implement logic to check balance > amount, then create a Withdrawal Request model
    return Response({'status': 'Withdrawal request received for KSh ' + str(amount)})