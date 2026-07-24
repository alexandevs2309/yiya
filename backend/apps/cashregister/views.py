from decimal import Decimal
from django.db import transaction
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from core.permissions import IsCashierOrAdmin, IsAdmin
from .models import CashRegister, CashMovement
from .serializers import (
    CashRegisterListSerializer, CashRegisterDetailSerializer,
    CashMovementSerializer, CashMovementCreateSerializer,
    OpenRegisterSerializer, CloseRegisterSerializer,
)


class CashRegisterViewSet(viewsets.ModelViewSet):
    serializer_class = CashRegisterListSerializer
    permission_classes = [permissions.IsAuthenticated, IsCashierOrAdmin]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return CashRegisterDetailSerializer
        return CashRegisterListSerializer

    def get_queryset(self):
        qs = CashRegister.objects.select_related('user')
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=False, methods=['post'])
    def open(self, request):
        user = request.user
        open_register = CashRegister.objects.filter(user=user, status='open').first()
        if open_register:
            return Response({
                'error': 'Ya tienes una caja abierta.',
                'register_id': str(open_register.id),
            }, status=status.HTTP_400_BAD_REQUEST)

        serializer = OpenRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        register = CashRegister.objects.create(
            user=user,
            opening_balance=serializer.validated_data['opening_balance'],
        )

        return Response(CashRegisterListSerializer(register).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        register = self.get_object()
        if register.status == 'closed':
            return Response({'error': 'Esta caja ya está cerrada.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CloseRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            register.close(
                actual_cash=serializer.validated_data['actual_cash'],
                notes=serializer.validated_data.get('notes', ''),
            )
            from apps.core.models import AuditLog
            AuditLog.objects.create(
                user=request.user,
                action='update',
                model_name='CashRegister',
                object_id=str(register.id),
                description=f'Cierre de caja: {register} — Esperado: {register.expected_cash} — Real: {register.actual_cash} — Diferencia: {register.difference}',
            )

        return Response(CashRegisterDetailSerializer(register).data)

    @action(detail=True, methods=['post'])
    def add_movement(self, request, pk=None):
        register = self.get_object()
        if register.status == 'closed':
            return Response({'error': 'No se pueden agregar movimientos a una caja cerrada.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CashMovementCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        movement = CashMovement.objects.create(
            register=register,
            type=serializer.validated_data['type'],
            amount=serializer.validated_data['amount'],
            reference=serializer.validated_data.get('reference', ''),
            description=serializer.validated_data.get('description', ''),
            created_by=request.user,
        )

        return Response(CashMovementSerializer(movement).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def report(self, request, pk=None):
        register = self.get_object()
        movements = register.movements.all()
        data = CashRegisterDetailSerializer(register).data
        data['movements'] = CashMovementSerializer(movements, many=True).data
        return Response(data)
