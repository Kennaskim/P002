from django.db import models
from django.contrib.auth.models import AbstractUser
from django.db.models import Avg

#User Model
class User(AbstractUser):
    USER_TYPE_CHOICES= (
        ('parent', 'Parent/Guardian'),
        ('school', 'School Administrator'),
        ('bookshop', 'Bookshop Owner'),
    )

#email as the unique identifier
    email = models.EmailField(unique=True)
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES, default='parent')
    location = models.CharField(max_length=100)
    rating = models.FloatField(default=0.0)
    review_count = models.IntegerField(default=0)
#use email for login
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

#textbook model
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

# listing model
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
    #who listed the textbook
    listed_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='listings')
    #what book is this?
    textbook = models.ForeignKey(Textbook, on_delete=models.CASCADE, related_name='listings')
    #details
    listing_type = models.CharField(max_length=10, choices=LISTING_TYPE_CHOICES)
    condition = models.CharField(max_length=10, choices=CONDITION_CHOICES)
    price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Required if for sale")
    description = models.TextField()
    is_active = models.BooleanField(default=True)
    views = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Listing for {self.textbook.title}"

#Bookshop model
class BookshopProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='bookshop_profile')
    shop_name = models.CharField(max_length=255)
    address = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20)
    opening_hours = models.CharField(max_length=100, help_text="e.g., Mon-Fri 9am-5pm")

    def __str__(self):
        return self.shop_name

#School model
class SchoolProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='school_profile')
    school_name = models.CharField(max_length=255)
    address = models.CharField(max_length=255)

    def __str__(self):
        return self.school_name

#Booklist model
class BookList(models.Model):
    school = models.ForeignKey(SchoolProfile, on_delete=models.CASCADE, related_name='book_lists')
    grade = models.CharField(max_length=50)
    academic_year = models.CharField(max_length=9, help_text="e.g., 2024-2025")
    # A ManyToManyField means one list has many books, and one book can be on many lists
    textbooks = models.ManyToManyField(Textbook, related_name='appears_on_lists')

    def __str__(self):
        return f"Book List for {self.grade} ({self.academic_year}) - {self.school.school_name}"

#Review Model
class Review(models.Model):
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name='reviews')
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_given')
    seller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_received')
    rating = models.IntegerField(choices=[(i, i) for i in range(1, 6)]) # 1-5 stars
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # After saving the review, update the seller's average rating
        self.seller.update_rating()

    def __str__(self):
        return f"Review by {self.reviewer.username} for {self.seller.username} ({self.rating} stars)"

#conversation model
class Conversation(models.Model):
    participants = models.ManyToManyField(User, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Conversation {self.id}"

#message model
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

#cart model
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
        unique_together = ('cart', 'listing') # Prevent adding same item twice

    def __str__(self):
        return f"{self.listing.textbook.title} in {self.cart.user.username}'s cart"
  
