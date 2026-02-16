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
from django.conf import settings
from decimal import Decimal
from .models import Textbook, Listing, BookshopProfile, SchoolProfile, BookList, Conversation, Message, Cart, CartItem, Review, SwapRequest, Order, Delivery, Payment, Wallet, WalletTransaction
from .serializers import UserSerializer, RegisterSerializer, TextbookSerializer, ListingSerializer, BookshopProfileSerializer, SchoolProfileSerializer, BookListSerializer, ConversationSerializer, MessageSerializer, CartItemSerializer, CartSerializer, ReviewSerializer, SwapRequestSerializer, OrderSerializer, DeliverySerializer, PaymentSerializer, WalletSerializer, WalletTransactionSerializer
from .permissions import IsOwnerOrReadOnly
import random, string, csv, io, openpyxl, requests
from .utils import get_delivery_cost
from .mpesa_utils import trigger_stk_push

User = get_user_model()

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class TextbookViewSet(viewsets.ModelViewSet):
    queryset = Textbook.objects.all()
    serializer_class = TextbookSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class ListingViewSet(viewsets.ModelViewSet):
    queryset = Listing.objects.select_related('listed_by', 'textbook').filter(is_active=True).order_by('-created_at')
    serializer_class = ListingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ['textbook__title', 'textbook__subject', 'description']
    filterset_fields = ['listing_type', 'condition']

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.views += 1
        instance.save(update_fields=['views'])
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
            for row in reader:
                title = row.get('title')
                if not title: continue

                textbook, created = Textbook.objects.get_or_create(
                    title__iexact=title,
                    defaults={
                        'title': title,
                        'author': row.get('author', 'Unknown'),
                        'subject': row.get('subject', 'General'),
                        'grade': 'General'
                    }
                )

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

class MyListingsView(generics.ListAPIView):
    serializer_class = ListingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Listing.objects.select_related('textbook').filter(listed_by=self.request.user).order_by('-created_at')

class BookshopViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BookshopProfile.objects.all().order_by('shop_name')
    serializer_class = BookshopProfileSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=['get'])
    def inventory(self, request, pk=None):
        bookshop = self.get_object()
        listings = Listing.objects.select_related('textbook').filter(listed_by=bookshop.user, is_active=True)
        serializer = ListingSerializer(listings, many=True)
        return Response(serializer.data)

class SchoolViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SchoolProfile.objects.all().order_by('school_name')
    serializer_class = SchoolProfileSerializer
    permission_classes = [permissions.AllowAny]

class BookListViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BookList.objects.select_related('school').prefetch_related('textbooks').all()
    serializer_class = BookListSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=['get'])
    def check_availability(self, request, pk=None):
        book_list = self.get_object()
        results = []
        
        for textbook in book_list.textbooks.all():
            listing = Listing.objects.filter(textbook=textbook, is_active=True).order_by('price').first()
            
            results.append({
                'textbook_title': textbook.title,
                'is_available': True if listing else False,
                'best_price': listing.price if listing else 0,
                'listing_id': listing.id if listing else None
            })
            
        return Response(results)

class SchoolBookListsView(generics.ListAPIView):
    serializer_class = BookListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        school_id = self.kwargs['school_id']
        return BookList.objects.select_related('school').prefetch_related('textbooks').filter(school__id=school_id)

    @action(detail=True, methods=['get'])
    def check_availability(self, request, pk=None):
        book_list = self.get_object()
        results = []
        
        for textbook in book_list.textbooks.all():
            listing = Listing.objects.filter(textbook=textbook, is_active=True).order_by('price').first()
            
            results.append({
                'textbook_title': textbook.title,
                'is_available': listing,
                'best_price': listing.price if listing else 0,
                'listing_id': listing.id if listing else None
            })
            
        return Response(results)

class ConversationListView(generics.ListAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.request.user.conversations.all().order_by('-updated_at')

class MessageListView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        conversation_id = self.kwargs['conversation_id']
        return Message.objects.filter(conversation__id=conversation_id).order_by('timestamp')

class FindOrCreateConversationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user_id = request.data.get('user_id')
        listing_id = request.data.get('listing_id') 

        if not user_id:
            return Response({"error": "user_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            other_user = User.objects.get(id=user_id)
            listing = Listing.objects.get(id=listing_id) if listing_id else None
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if other_user == request.user:
            return Response({"error": "Cannot create conversation with yourself."}, status=status.HTTP_400_BAD_REQUEST)

        conversation = Conversation.objects.filter(participants=request.user)\
            .filter(participants=other_user).first()

        if conversation:
            if listing:
                conversation.listing = listing
                conversation.save()
            
            serializer = ConversationSerializer(conversation, context={'request': request})
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            conversation = Conversation.objects.create(listing=listing)
            conversation.participants.add(request.user, other_user)
            serializer = ConversationSerializer(conversation, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)

class CartView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        serializer = CartSerializer(cart)
        return Response(serializer.data)

    def post(self, request):
        listing_id = request.data.get('listing_id')
        cart, _ = Cart.objects.get_or_create(user=request.user)
        
        try:
            listing = Listing.objects.get(id=listing_id, is_active=True)
        except Listing.DoesNotExist:
            return Response({"error": "Listing not found"}, status=404)

        if listing.listed_by == request.user:
             return Response({"error": "Cannot buy your own book"}, status=400)

        CartItem.objects.get_or_create(cart=cart, listing=listing)
        
        serializer = CartSerializer(cart)
        return Response(serializer.data)

    def delete(self, request):
        item_id = request.data.get('item_id')
        cart = Cart.objects.get(user=request.user)
        CartItem.objects.filter(cart=cart, id=item_id).delete()
        
        serializer = CartSerializer(cart)
        return Response(serializer.data)

class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        listing = serializer.validated_data['listing']
        if listing.listed_by == self.request.user:
            raise ValidationError("You cannot review your own listing.")
            
        serializer.save(
            reviewer=self.request.user,
            seller=listing.listed_by
        )

class UserReviewsView(generics.ListAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user_id = self.kwargs['user_id']
        return Review.objects.filter(seller__id=user_id).order_by('-created_at')

class MyBookListsView(viewsets.ModelViewSet):
    serializer_class = BookListSerializer
    permission_classes = [permissions.IsAuthenticated] 

    def get_queryset(self):
        if hasattr(self.request.user, 'school_profile'):
            return BookList.objects.prefetch_related('textbooks').filter(school=self.request.user.school_profile)
        return BookList.objects.none()

    def perform_create(self, serializer):
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

class MyProfileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        data = UserSerializer(user).data
        
        if user.user_type == 'school' and hasattr(user, 'school_profile'):
            data['profile'] = SchoolProfileSerializer(user.school_profile).data
        elif user.user_type == 'bookshop' and hasattr(user, 'bookshop_profile'):
            data['profile'] = BookshopProfileSerializer(user.bookshop_profile).data
            
        return Response(data)

    def patch(self, request):
        user = request.user
        
        user_serializer = UserSerializer(user, data=request.data, partial=True)
        if user_serializer.is_valid():
            user_serializer.save()
        else:
            return Response(user_serializer.errors, status=400)

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

        return Response(UserSerializer(user).data)

class SwapRequestViewSet(viewsets.ModelViewSet):
    serializer_class = SwapRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SwapRequest.objects.filter(
            Q(sender=self.request.user) | Q(receiver=self.request.user)
        ).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        req_id = request.data.get('requested_listing_id')
        off_id = request.data.get('offered_listing_id')

        existing_swap = SwapRequest.objects.filter(
            requested_listing_id=req_id,
            offered_listing_id=off_id
        ).first()

        if existing_swap:
            if existing_swap.status in ['cancelled', 'rejected']:
                existing_swap.delete()
            else:
                return Response(
                    {'error': 'An active swap request already exists for these books.'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        requested_listing = serializer.validated_data['requested_listing']
        
        if requested_listing.listed_by == self.request.user:
            raise ValidationError("You cannot swap with yourself.")
            
        serializer.save(
            sender=self.request.user,
            receiver=requested_listing.listed_by
        )

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        swap = self.get_object()
        
        if request.user != swap.receiver:
            return Response({'error': 'Not authorized'}, status=403)
            
        swap.status = 'accepted'
        swap.save()
        
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
        
        conversation = Conversation.objects.filter(participants=swap.sender)\
            .filter(participants=swap.receiver).first()

        if not conversation:
            conversation = Conversation.objects.create(listing=swap.requested_listing)
            conversation.participants.add(swap.sender, swap.receiver)
        else:
            conversation.listing = swap.requested_listing
            conversation.save()
       
        Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=f"✅ SYSTEM: I have accepted your swap offer for '{swap.requested_listing.textbook.title}'."
        )
        
        return Response({'status': 'Swap Accepted', 'conversation_id': conversation.id})

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

        sender = swap.sender
        receiver = request.user 
        
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

    @action(detail=False, methods=['post'])
    def calculate_delivery_fee(self, request):
        delivery_id = request.data.get('delivery_id')
        
        if delivery_id:
            try:
                delivery = Delivery.objects.get(id=delivery_id)
                pickup = delivery.pickup_location
                dropoff = delivery.dropoff_location
                is_swap = delivery.swap is not None

                cost, distance, pickup_coords, dropoff_coords, route_geometry, error = get_delivery_cost(pickup, dropoff, is_swap)

                if error:
                    return Response({'error': error}, status=400)

                delivery.transport_cost = cost
                delivery.save()

                return Response({
                    'fee': cost,
                    'distance': distance,
                    'pickup_coords': pickup_coords,
                    'dropoff_coords': dropoff_coords,
                    'route_geometry': route_geometry,
                    'message': f"Location updated. Distance: {distance}. New Cost: KSh {cost}"
                })

            except Delivery.DoesNotExist:
                return Response({'error': 'Delivery not found'}, status=404)

        else:
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

    @action(detail=True, methods=['post'])
    def accept_job(self, request, pk=None):
        delivery = self.get_object()
        user = request.user
        active_job = Delivery.objects.filter(rider_phone=user.phone_number, status='shipped').exists()
        
        if active_job:
            return Response({'error': '⛔ You have an unfinished delivery! Complete it first.'}, status=400)
        
        if delivery.status != 'paid':
            return Response({'error': 'Job is no longer available.'}, status=400)

        delivery.status = 'shipped'
        delivery.rider = user
        delivery.rider_phone = user.phone_number
        delivery.save()
        
        conversation, created = Conversation.objects.get_or_create(
            delivery=delivery,
            defaults={'listing': None} 
        )

        participants_to_add = [user]

        if delivery.orders.exists():
            order = delivery.orders.first()
            participants_to_add.append(order.buyer)
            participants_to_add.append(order.listing.listed_by)
            
        elif delivery.swap:
            participants_to_add.append(delivery.swap.sender)
            participants_to_add.append(delivery.swap.receiver)

        conversation.participants.add(*participants_to_add)

        if created:
             Message.objects.create(
                conversation=conversation,
                sender=user,
                content="🔔 SYSTEM: Rider has joined. Delivery Group Chat (Rider + Buyer + Seller) is active."
            )

        return Response({
            'status': 'Job Accepted', 
            'tracking_code': delivery.tracking_code, 
            'delivery': DeliverySerializer(delivery).data
        })

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

    @action(detail=True, methods=['post'])
    def complete_job(self, request, pk=None):
        delivery = self.get_object()
        user = request.user
        
        if delivery.status == 'delivered':
            return Response({'error': 'Job already completed'}, status=400)

        if not delivery.rider and user.user_type == 'rider':
            delivery.rider = user
            delivery.save()
            print(f"⚠️ Fixed missing rider. Assigned to {user.username}")

        delivery.status = 'delivered'
        delivery.save()

        with transaction.atomic():
            if delivery.rider:
                rider_wallet, _ = Wallet.objects.get_or_create(user=delivery.rider)
                
                amount_to_pay = delivery.transport_cost
                if amount_to_pay <= 0:
                    amount_to_pay = Decimal('200.00') 
                
                current_balance = Decimal(str(rider_wallet.balance))
                rider_wallet.balance = current_balance + amount_to_pay
                rider_wallet.save()
                
                WalletTransaction.objects.create(
                    wallet=rider_wallet,
                    amount=amount_to_pay,
                    transaction_type='credit',
                    description=f"Delivery Fee for Order #{delivery.tracking_code}"
                )
                print(f"DEBUG: Rider Paid {amount_to_pay}. New Balance: {rider_wallet.balance}")
            
            for order in delivery.orders.all():
                seller = order.listing.listed_by
                seller_wallet, _ = Wallet.objects.get_or_create(user=seller)
                
                current_seller_balance = Decimal(str(seller_wallet.balance))
                seller_wallet.balance = current_seller_balance + order.amount_paid
                seller_wallet.save()
                
                WalletTransaction.objects.create(
                    wallet=seller_wallet,
                    amount=order.amount_paid,
                    transaction_type='credit',
                    description=f"Sale of '{order.listing.textbook.title}'"
                )
                print(f"DEBUG: Seller Paid {order.amount_paid}. New Balance: {seller_wallet.balance}")

        return Response({'status': 'Job Completed & Wallets Credited'})

    @action(detail=True, methods=['post'])
    def cancel_order(self, request, pk=None):
        delivery = self.get_object()
        buyer = request.user
        
        if delivery.status in ['shipped', 'delivered']:
            return Response({'error': 'Cannot cancel order that is already in transit.'}, status=400)
            
        delivery.status = 'cancelled'
        delivery.save()
        
        if delivery.orders.exists():
            for order in delivery.orders.all():
                order.listing.is_active = True
                order.listing.save()
            
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
    

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        listing_ids = request.data.get('listing_ids', [])
        if not listing_ids:
            return Response({'error': 'No books selected'}, status=400)

        listings = Listing.objects.filter(id__in=listing_ids, is_active=True)
        if len(listings) != len(listing_ids):
             return Response({'error': 'One or more books have already been sold. Please clear your cart and try again.'}, status=400)

        seller_groups = {}
        for listing in listings:
            seller_id = listing.listed_by.id
            if seller_id not in seller_groups:
                seller_groups[seller_id] = []
            seller_groups[seller_id].append(listing)

        created_count = 0

        try:
            with transaction.atomic():
                for seller_id, group_listings in seller_groups.items():
                    seller = group_listings[0].listed_by
                    
                    delivery = Delivery.objects.create(
                        pickup_location=seller.location,
                        dropoff_location=request.user.location,
                        transport_cost=0.00, 
                        status='pending'
                    )

                    book_titles = []
                    for listing in group_listings:
                        order = Order.objects.create(
                            buyer=request.user,
                            listing=listing,
                            amount_paid=listing.price
                        )
                        listing.is_active = False 
                        listing.save()
                        
                        delivery.orders.add(order)
                        book_titles.append(listing.textbook.title)
                        created_count += 1
                        
                        CartItem.objects.filter(cart__user=request.user, listing=listing).delete()

                    titles_str = ", ".join(book_titles)
                    
                    conversation = Conversation.objects.filter(participants=request.user)\
                        .filter(participants=seller).first()
                    
                    if not conversation:
                        conversation = Conversation.objects.create(listing=group_listings[0])
                        conversation.participants.add(request.user, seller)
                    else:
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


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def initiate_mpesa(self, request):
        delivery_id = request.data.get('delivery_id')
        phone = request.data.get('phone_number')

        try:
            delivery = Delivery.objects.get(id=delivery_id)
        except Delivery.DoesNotExist:
            return Response({'error': 'Delivery not found'}, status=404)

        books_total = sum(order.amount_paid for order in delivery.orders.all())
        
        total_amount = books_total + delivery.transport_cost

        response = trigger_stk_push(phone, total_amount, delivery.id)
        
        if 'ResponseCode' in response and response['ResponseCode'] == '0':
            payment,created = Payment.objects.update_or_create(
                delivery=delivery,
                defaults={
                    'user':request.user,
                    'phone_number':phone,
                    'amount':total_amount,
                    'is_successful':False, 
                    'transaction_code':response.get('CheckoutRequestID')
                }
            )
            
            payment.is_successful = True
            payment.save()
            delivery.status = 'paid'
            delivery.tracking_code = f"TRK-{random.randint(1000, 9999)}"
            delivery.save()

            return Response({
                'status': 'STK Push Sent. Check your phone.',
                'checkout_id': response.get('CheckoutRequestID'),
                'tracking_code': delivery.tracking_code,
                'amount': total_amount 
            })
        else:
            error_message = response.get('errorMessage', 'M-Pesa Connection Failed')
            return Response({'error': error_message, 'details': response}, status=400)

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def callback(self, request):
        data = request.data
        
        body = data.get('Body', {}).get('stkCallback', {})
        result_code = body.get('ResultCode')
        checkout_id = body.get('CheckoutRequestID')

        if not checkout_id:
            return Response({'status': 'Invalid Data'}, status=400)

        try:
            payment = Payment.objects.get(transaction_code=checkout_id)
            delivery = payment.delivery
            
            if result_code == 0:
                payment.is_successful = True
                payment.save()
                
                delivery.status = 'paid'
                delivery.tracking_code = f"TRK-{random.randint(1000, 9999)}"
                delivery.save()
                
                print(f"Payment Confirmed for Order {delivery.id}")
            else:
                print(f"Payment Failed for Order {delivery.id}: {body.get('ResultDesc')}")
        
        except Payment.DoesNotExist:
            print("Payment record not found for this callback")

        return Response({'status': 'Callback Received'})

    @action(detail=False, methods=['post'])
    def initiate_paystack(self, request):
        
        delivery_id = request.data.get('delivery_id')
        email = request.user.email

        try:
            delivery = Delivery.objects.get(id=delivery_id)
        except Delivery.DoesNotExist:
            return Response({'error': 'Delivery not found'}, status=404)

        books_total = sum(order.amount_paid for order in delivery.orders.all())
        total_amount = books_total + delivery.transport_cost
        
        amount_in_kobo = int(total_amount * 100)

        url = "https://api.paystack.co/transaction/initialize"
        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json",
        }
        data = {
            "email": email,
            "amount": amount_in_kobo,
            "currency": "KES",
            "callback_url": "http://localhost:5173/payment/verify",
            "metadata": {
                "delivery_id": delivery.id,
                "user_id": request.user.id
            }
        }

        response = requests.post(url, headers=headers, json=data)
        res_data = response.json()

        if res_data['status']:
            Payment.objects.update_or_create(
               delivery=delivery,
                defaults={
                    'user': request.user,
                    'amount': total_amount,
                    'payment_method': 'card',
                    'paystack_ref': res_data['data']['reference'],
                    'is_successful': False,
                    'transaction_code': None 
                }
            )
            return Response({'authorization_url': res_data['data']['authorization_url']})
        else:
            return Response({'error': res_data['message']}, status=400)

    @action(detail=False, methods=['post'])
    def verify_paystack(self, request):
        reference = request.data.get('reference')
        
        url = f"https://api.paystack.co/transaction/verify/{reference}"
        headers = {"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"}

        response = requests.get(url, headers=headers)
        res_data = response.json()

        if res_data['status'] and res_data['data']['status'] == 'success':
            try:
                payment = Payment.objects.get(paystack_ref=reference)
                payment.is_successful = True
                payment.save()

                delivery = payment.delivery
                delivery.status = 'paid'
                delivery.tracking_code = f"TRK-{random.randint(1000, 9999)}"
                delivery.save()

                return Response({'status': 'Payment Verified', 'tracking_code': delivery.tracking_code})
            except Payment.DoesNotExist:
                return Response({'error': 'Payment record not found'}, status=404)
        else:
            return Response({'error': 'Verification failed'}, status=400)
        
class MyEarningsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        transactions = WalletTransaction.objects.filter(wallet=wallet).order_by('-timestamp')[:20]
        
        return Response({
            'balance': wallet.balance,
            'history': WalletTransactionSerializer(transactions, many=True).data
        })

class WithdrawalView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        amount = Decimal(request.data.get('amount', 0))
        wallet, _ = Wallet.objects.get_or_create(user=request.user)

        if amount <= 0:
            return Response({'error': 'Invalid amount'}, status=400)
        if wallet.balance < amount:
            return Response({'error': 'Insufficient funds'}, status=400)

        wallet.balance -= amount
        wallet.save()

        WalletTransaction.objects.create(
            wallet=wallet,
            amount=amount,
            transaction_type='debit',
            description="Withdrawal Request"
        )

        return Response({'status': 'Withdrawal Successful', 'new_balance': wallet.balance})