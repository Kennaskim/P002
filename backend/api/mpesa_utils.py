import requests
import base64
from datetime import datetime
from django.conf import settings

def get_access_token():
    consumer_key = settings.MPESA_CONSUMER_KEY
    consumer_secret = settings.MPESA_CONSUMER_SECRET
    api_url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    
    try:
        response = requests.get(api_url, auth=(consumer_key, consumer_secret))
        response.raise_for_status()
        return response.json()['access_token']
    except Exception as e:
        print(f"M-Pesa Token Error: {e}")
        return None

def trigger_stk_push(phone_number, amount, reference_code):
    access_token = get_access_token()
    if not access_token:
        return {"error": "Failed to authenticate with M-Pesa"}

    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    shortcode = settings.MPESA_SHORTCODE
    passkey = settings.MPESA_PASSKEY
    
    password_str = f"{shortcode}{passkey}{timestamp}"
    password = base64.b64encode(password_str.encode()).decode()

    if phone_number.startswith('0'):
        phone_number = '254' + phone_number[1:]
    elif phone_number.startswith('+254'):
        phone_number = phone_number[1:]

    payload = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(amount),
        "PartyA": phone_number,
        "PartyB": shortcode,
        "PhoneNumber": phone_number,
        "CallBackURL": settings.MPESA_CALLBACK_URL, 
        "AccountReference": f"Order-{reference_code}",
        "TransactionDesc": "Textbook Delivery Fee"
    }

    api_url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
    headers = { "Authorization": f"Bearer {access_token}" }

    try:
        response = requests.post(api_url, json=payload, headers=headers)
        return response.json()
    except Exception as e:
        return {"error": str(e)}