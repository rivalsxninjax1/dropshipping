from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import User, Wishlist


@receiver(post_save, sender=User)
def ensure_wishlist(sender, instance: User, created: bool, **kwargs):
    if created:
        Wishlist.objects.get_or_create(user=instance)
