from django.db.models import Avg, F, IntegerField
from django.db.models.functions import Coalesce
import django_filters as filters
from .models import Product


class ProductFilter(filters.FilterSet):
    category = filters.CharFilter(field_name="category__slug", lookup_expr="iexact")
    price_min = filters.NumberFilter(field_name="base_price", lookup_expr="gte")
    price_max = filters.NumberFilter(field_name="base_price", lookup_expr="lte")
    rating_min = filters.NumberFilter(method="filter_rating_min")
    brand = filters.CharFilter(field_name="brand", lookup_expr="icontains")
    supplier = filters.CharFilter(field_name="supplier__name", lookup_expr="icontains")
    stock = filters.BooleanFilter(method="filter_stock")
    shipping_max = filters.NumberFilter(field_name="shipping_time_max_days", lookup_expr="lte")
    size = filters.CharFilter(method="filter_size")
    color = filters.CharFilter(method="filter_color")

    def filter_rating_min(self, queryset, name, value):
        queryset = queryset.annotate(avg_rating=Avg("reviews__rating"))
        return queryset.filter(avg_rating__gte=value)

    def filter_stock(self, queryset, name, value):
        queryset = queryset.annotate(stock_qty=Coalesce(F("inventory__quantity"), 0, output_field=IntegerField()))
        if value:
            return queryset.filter(stock_qty__gt=0)
        return queryset.filter(stock_qty__lte=0)

    def filter_size(self, queryset, name, value):
        return queryset.filter(variants__size__iexact=value).distinct()

    def filter_color(self, queryset, name, value):
        return queryset.filter(variants__color__icontains=value).distinct()

    class Meta:
        model = Product
        fields = [
            "category",
            "price_min",
            "price_max",
            "rating_min",
            "brand",
            "supplier",
            "stock",
            "shipping_max",
            "size",
            "color",
        ]
