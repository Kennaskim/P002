import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import Conversation, Message


User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # 1. Get the conversation ID from the URL (e.g., ws/chat/1/)
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data['message']
        sender_id = data['sender_id']

        await self.save_message(sender_id, message)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'sender_id': sender_id
            }
        )

    async def chat_message(self, event):
        message = event['message']
        sender_id = event['sender_id']

        await self.send(text_data=json.dumps({
            'message': message,
            'sender_id': sender_id
        }))

    @database_sync_to_async
    def save_message(self, sender_id, message):
        user = User.objects.get(id=sender_id)
        conversation = Conversation.objects.get(id=self.room_id)
        Message.objects.create(conversation=conversation, sender=user, content=message)
        conversation.save()

class DeliveryConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.delivery_id = self.scope['url_route']['kwargs']['delivery_id']
        self.group_name = f'delivery_{self.delivery_id}'

        # Join the delivery group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    # Receive location from Rider
    async def receive(self, text_data):
        data = json.loads(text_data)
        
        # Broadcast to everyone in the group (Buyer/Seller)
        await self.channel_layer.group_send(
            self.group_name,
            {
                'type': 'delivery_update',
                'latitude': data.get('latitude'),
                'longitude': data.get('longitude'),
                'status': data.get('status'),
                'heading': data.get('heading', 0) 
            }
        )

    # Send update to WebSocket
    async def delivery_update(self, event):
        await self.send(text_data=json.dumps({
            'latitude': event['latitude'],
            'longitude': event['longitude'],
            'status': event['status'],
            'heading': event.get('heading', 0)
        }))