from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Textbook, Listing, BookshopProfile, SchoolProfile, BookList, Conversation, Message, Cart, CartItem, Review, SwapRequest

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'username', 'user_type', 'rating', 'location', 'national_id', 'phone_number']

class RegisterSerializer(serializers.ModelSerializer):
   
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'username', 'password', 'user_type', 'location']

    def create(self, validated_data):
        national_id = validated_data.get('national_id', '')
        if not national_id:
            national_id = None

        phone_number = validated_data.get('phone_number', '')
        if not phone_number:
            phone_number = None

        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            password=validated_data['password'],
            user_type=validated_data.get('user_type', 'parent'),
            location=validated_data.get('location', ''),
            national_id=national_id,     
            phone_number=phone_number     
        )
        return user

class TextbookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Textbook
        fields = '__all__' 

class ListingSerializer(serializers.ModelSerializer):
    listed_by = UserSerializer(read_only=True)
    textbook = TextbookSerializer(read_only=True)
    
    textbook_id = serializers.PrimaryKeyRelatedField(
        queryset=Textbook.objects.all(), 
        source='textbook', 
        write_only=True
    )

    class Meta:
        model = Listing
        fields = [
            'id', 'listed_by', 'textbook', 'textbook_id', 
            'listing_type', 'condition', 'price', 'description', 
            'is_active', 'created_at', 'views'
        ]
        read_only_fields = ('id', 'listed_by', 'created_at', 'views')
    
class BookshopProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookshopProfile
        fields = '__all__'

class SchoolProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolProfile
        fields = '__all__'

class BookListSerializer(serializers.ModelSerializer):
    textbooks = TextbookSerializer(many=True, read_only=True)
    school = SchoolProfileSerializer(read_only=True)

    class Meta:
        model = BookList
        fields = '__all__'

class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    class Meta:
        model = Message
        fields = ['id', 'sender', 'content', 'timestamp', 'is_read']

class ConversationSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    listing = ListingSerializer(read_only=True)

    class Meta:
        model = Conversation
        fields = ['id', 'other_user', 'last_message', 'updated_at', 'listing']

    def get_other_user(self, obj):
        # Find the participant who is NOT the request user
        request = self.context.get('request')
        if request and request.user:
            other = obj.participants.exclude(id=request.user.id).first()
            if other:
                return UserSerializer(other).data
        return None

    def get_last_message(self, obj):
        last_msg = obj.messages.last()
        return last_msg.content if last_msg else ""

class CartItemSerializer(serializers.ModelSerializer):
    listing = ListingSerializer(read_only=True) # Show full listing details
    
    class Meta:
        model = CartItem
        fields = ['id', 'listing', 'added_at']

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ['id', 'items', 'total']

    def get_total(self, obj):
        # Calculate total price of all items in cart
        return sum(item.listing.price for item in obj.items.all())

class ReviewSerializer(serializers.ModelSerializer):
    reviewer = UserSerializer(read_only=True) # Show who wrote the review

    class Meta:
        model = Review
        fields = ['id', 'listing', 'reviewer', 'seller', 'rating', 'comment', 'created_at']
        read_only_fields = ('id', 'reviewer', 'seller', 'created_at')

class SwapRequestSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    receiver = UserSerializer(read_only=True)
    requested_listing = ListingSerializer(read_only=True)
    offered_listing = ListingSerializer(read_only=True)

    # For creating the request, we only send IDs
    requested_listing_id = serializers.PrimaryKeyRelatedField(
        queryset=Listing.objects.all(), source='requested_listing', write_only=True
    )
    offered_listing_id = serializers.PrimaryKeyRelatedField(
        queryset=Listing.objects.all(), source='offered_listing', write_only=True
    )

    class Meta:
        model = SwapRequest
        fields = [
            'id', 'sender', 'receiver', 'status', 'created_at',
            'requested_listing', 'offered_listing',
            'requested_listing_id', 'offered_listing_id'
        ]
        read_only_fields = ['id', 'sender', 'receiver', 'status', 'created_at']