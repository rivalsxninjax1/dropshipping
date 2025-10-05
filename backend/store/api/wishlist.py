from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from store.models import Wishlist, WishlistItem, Product
from store.serializers import WishlistSerializer


class WishlistViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = WishlistSerializer

    def get_object(self):
        wishlist, _ = Wishlist.objects.get_or_create(user=self.request.user)
        return wishlist

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        product_id = request.data.get("product_id")
        if not product_id:
            return Response({"detail": "product_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        product = get_object_or_404(Product, id=product_id)
        wishlist = self.get_object()
        WishlistItem.objects.get_or_create(wishlist=wishlist, product=product)
        serializer = self.get_serializer(wishlist)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["delete"], url_path="items/(?P<product_id>[^/.]+)")
    def remove(self, request, product_id: str):
        wishlist = self.get_object()
        WishlistItem.objects.filter(wishlist=wishlist, product_id=product_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"], url_path="clear")
    def clear(self, request):
        wishlist = self.get_object()
        wishlist.items.all().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
