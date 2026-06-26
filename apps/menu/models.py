from django.db import models
from apps.core.models import BaseModel


class Category(BaseModel):
    name = models.CharField(max_length=100)
    icon = models.CharField(
        max_length=50,
        default="utensils-crossed",
        help_text="Nombre del ícono Lucide",
    )
    sort_order = models.IntegerField(default=0)
    active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Categoría"
        verbose_name_plural = "Categorías"
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name


class MenuItem(BaseModel):
    category = models.ForeignKey(
        Category,
        on_delete=models.CASCADE,
        related_name="items",
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    price_base = models.DecimalField(max_digits=10, decimal_places=2)
    price_today = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        help_text="Precio del día para mariscos/precios variables",
    )
    image = models.ImageField(
        upload_to="menu/",
        blank=True,
        help_text="Foto del plato (opcional)",
    )
    available_today = models.BooleanField(
        default=True,
        help_text="Disponible hoy — toggle rápido sin borrar",
    )
    is_platillo_dia = models.BooleanField(
        default=False,
        help_text="Plato del día — visible destacado",
    )
    modifiers_available = models.JSONField(
        default=list,
        blank=True,
        help_text="Modificadores disponibles: [{'name':'sin sal','type':'toggle'}, ...]",
    )
    active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)

    class Meta:
        verbose_name = "Producto del menú"
        verbose_name_plural = "Productos del menú"
        ordering = ["category__sort_order", "sort_order", "name"]

    def __str__(self):
        return self.name

    @property
    def effective_price(self):
        return self.price_today if self.price_today else self.price_base
