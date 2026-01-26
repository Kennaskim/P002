from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Textbook, Listing, SchoolProfile, BookshopProfile, BookList, Review, Conversation, Message, Cart, CartItem, SwapRequest, Order, Delivery, Payment

# Register the custom User model
admin.site.register(User, UserAdmin)

# Register the other models so they appear in the dashboard
admin.site.register(Textbook)
admin.site.register(Listing)
admin.site.register(SchoolProfile)
admin.site.register(BookshopProfile)
admin.site.register(BookList)
admin.site.register(Review)
admin.site.register(Conversation)
admin.site.register(Message)
admin.site.register(Cart)
admin.site.register(CartItem)
admin.site.register(SwapRequest)
admin.site.register(Order)
admin.site.register(Delivery)
admin.site.register(Payment)
