import base64
import os
import logging
from email.mime.text import MIMEText
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from django.conf import settings

logger = logging.getLogger(__name__)

def send_email_via_gmail(to, subject, body):
    """
    Send an email using Gmail API with the credentials provided in environment variables.
    
    Args:
        to (str): Recipient email address
        subject (str): Email subject
        body (str): Email body content (plain text)
    
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    try:
        # Use environment variables for credentials
        email_user = settings.EMAIL_HOST_USER or os.environ.get('EMAIL_HOST_USER')
        email_password = settings.EMAIL_HOST_PASSWORD or os.environ.get('EMAIL_HOST_PASSWORD')
        
        if not email_user or not email_password:
            logger.error("Missing Gmail credentials. Check EMAIL_HOST_USER and EMAIL_HOST_PASSWORD settings.")
            return False
            
        # Create a MIMEText object for the email content
        message = MIMEText(body)
        message['to'] = to
        message['from'] = email_user
        message['subject'] = subject
        
        # Encode the message
        raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
        
        # Send the message using Gmail's SMTP server
        import smtplib
        server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
        server.ehlo()
        server.starttls()
        server.login(email_user, email_password)
        server.sendmail(email_user, to, message.as_string())
        server.close()
        
        logger.info(f"Email sent successfully to {to}")
        return True
        
    except Exception as e:
        logger.exception(f"Failed to send email: {str(e)}")
        return False