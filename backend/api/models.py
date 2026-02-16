from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models import Avg

class User(AbstractUser):
    USER_TYPE_CHOICES= (
        ('parent', 'Parent/Guardian'),
        ('school', 'School Administrator'),
        ('bookshop', 'Bookshop Owner'),
        ('rider', 'Rider'),
    )

    email = models.EmailField(unique=True)
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES, default='parent')
    location = models.CharField(max_length=100)
    rating = models.FloatField(default=0.0)
    review_count = models.IntegerField(default=0)
    national_id = models.CharField(max_length=15, unique=True, blank=True, null=True) 
    phone_number = models.CharField(max_length=15, blank=True, null=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    def update_rating(self):
      reviews = self.reviews_received.all() 
      if reviews.exists():
        self.rating = reviews.aggregate(Avg('rating'))['rating__avg'] or 0.0
        self.review_count = reviews.count()
      else:
        self.rating = 0.0
        self.review_count = 0
      self.save() 

class Textbook(models.Model):
    title = models.CharField(max_length=200)
    author = models.CharField(max_length=200, blank=True)
    isbn = models.CharField(max_length=13, unique=True, blank=True, null=True)
    grade = models.CharField(max_length=50) 
    subject = models.CharField(max_length=100)
    publisher = models.CharField(max_length=100, blank=True)
    cover_image = models.ImageField(upload_to='book_covers/', blank=True, null=True, default='book_covers/default.jpg')

    def __str__(self):
        return f"{self.title} (Grade {self.grade})" 

class Listing(models.Model):
    LISTING_TYPE_CHOICES = (
        ('sell', 'For Sale'),
        ('exchange', 'For Exchange'),
    )
    CONDITION_CHOICES = (
        ('new', 'New'),
        ('good', 'Good'),
        ('fair', 'Fair'),
    )

    listed_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='listings')
    textbook = models.ForeignKey(Textbook, on_delete=models.CASCADE, related_name='listings')
    listing_type = models.CharField(max_length=10, choices=LISTING_TYPE_CHOICES)
    condition = models.CharField(max_length=10, choices=CONDITION_CHOICES)
    price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Required if for sale")
    description = models.TextField()
    is_active = models.BooleanField(default=True)
    views = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Listing for {self.textbook.title}"

class BookshopProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='bookshop_profile')
    shop_name = models.CharField(max_length=255)
    address = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20)
    opening_hours = models.CharField(max_length=100, help_text="e.g., Mon-Fri 9am-5pm")

    def __str__(self):
        return self.shop_name

class SchoolProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='school_profile')
    school_name = models.CharField(max_length=255)
    address = models.CharField(max_length=255)

    def __str__(self):
        return self.school_name

class BookList(models.Model):
    school = models.ForeignKey(SchoolProfile, on_delete=models.CASCADE, related_name='book_lists')
    grade = models.CharField(max_length=50)
    academic_year = models.CharField(max_length=20, help_text="e.g., 2024-2025")
    textbooks = models.ManyToManyField(Textbook, related_name='appears_on_lists')

    def __str__(self):
        return f"Book List for {self.grade} ({self.academic_year}) - {self.school.school_name}"

class Review(models.Model):
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='reviews')
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_given')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_received')
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.seller.update_rating()

    def __str__(self):
        return f"Review by {self.reviewer.username} for {self.seller.username} ({self.rating} stars)"

class Conversation(models.Model):
    participants = models.ManyToManyField(User, related_name='conversations')
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='conversations', null=True, blank=True)
    delivery = models.ForeignKey('Delivery', on_delete=models.CASCADE, related_name='conversations', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Conversation {self.id}-{self.listing}"

class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"Message from {self.sender.username}"

class Cart(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='cart')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Cart for {self.user.username}"

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('cart', 'listing')

    def __str__(self):
        return f"{self.listing.textbook.title} in {self.cart.user.username}'s cart"

class SwapRequest(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
    )

    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_swaps')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_swaps')
    requested_listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='swap_requests_received')
    offered_listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='swap_requests_sent')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('requested_listing', 'offered_listing')

    def __str__(self):
        return f"{self.sender.username} offers {self.offered_listing.textbook.title} for {self.requested_listing.textbook.title}"

class Order(models.Model):
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE) 
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Order {self.id} - {self.listing.textbook.title}"

class Delivery(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Payment'),
        ('paid', 'Processing'),
        ('shipped', 'In Transit'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]
    
    orders = models.ManyToManyField(Order, related_name='delivery')    
    swap = models.OneToOneField(SwapRequest, null=True, blank=True, on_delete=models.CASCADE, related_name='delivery')

    pickup_location = models.CharField(max_length=255)
    dropoff_location = models.CharField(max_length=255)
    tracking_code = models.CharField(max_length=20, unique=True, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rider = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='deliveries_assigned')
    rider_phone = models.CharField(max_length=15, blank=True, null=True)
    
    transport_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00) 
    created_at = models.DateTimeField(auto_now_add=True)

    current_lat = models.FloatField(null=True, blank=True)
    current_lng = models.FloatField(null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)


    def __str__(self):
        return f"Delivery {self.tracking_code or 'Pending'}"

class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = (
        ('mpesa', 'M-Pesa'),
        ('card', 'Credit(Paystack)'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    delivery = models.OneToOneField(Delivery, on_delete=models.CASCADE, related_name='payment')
    
    phone_number = models.CharField(max_length=15) 
    payment_method = models.CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES, default='mpesa') 
    paystack_ref = models.CharField(max_length=100, blank=True, null=True)

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_code = models.CharField(max_length=50, blank=True, null=True)
    is_successful = models.BooleanField(default=False)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment {self.transaction_code or self.paystack_ref} - {self.amount}"

class Wallet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wallet')
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}'s Wallet (KSh {self.balance})"

class WalletTransaction(models.Model):
    TRANSACTION_TYPES = (
        ('credit', 'Credit (Earnings)'),
        ('debit', 'Debit (Withdrawal)'),
    )
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='transactions')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    description = models.CharField(max_length=255) 
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.transaction_type} - {self.amount}"
  
from django.dispatch import receiver
from django.db.models.signals import post_save
from django_rest_passwordreset.signals import reset_password_token_created
from django.core.mail import send_mail
from django.urls import reverse

@receiver(post_save, sender=User)
def create_user_wallet(sender, instance, created, **kwargs):
    if created:
        Wallet.objects.create(user=instance)

@receiver(reset_password_token_created)
def password_reset_token_created(sender, instance, reset_password_token, *args, **kwargs):
    print(f"\n\n==========================================")
    print(f"PASSWORD RESET TOKEN FOR {reset_password_token.user.email}")
    print(f"Token: {reset_password_token.key}")
    print(f"==========================================\n\n")

    email_plaintext_message = "Use this token to reset your password: {}".format(reset_password_token.key)

    send_mail(
        "Password Reset for {title}".format(title="Textbook Exchange"),
        email_plaintext_message,
        "noreply@textbookexchange.com",
        [reset_password_token.user.email]
    )