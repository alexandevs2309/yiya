from rest_framework import viewsets, permissions, status, mixins
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, Customer, AuditLog, EmployeeShift, PayrollPayment, BusinessConfig, TaxConfig
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer, CustomerSerializer, AuditLogSerializer,
    EmployeeShiftSerializer, PayrollPaymentSerializer, BusinessConfigSerializer, TaxConfigSerializer
)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def pin_login(request):
    pin = request.data.get('pin', '').strip()
    if not pin or not pin.isdigit() or len(pin) < 4:
        return Response({'detail': 'PIN inválido'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(pin=pin, is_active=True)
    except User.DoesNotExist:
        return Response({'detail': 'PIN incorrecto'}, status=status.HTTP_401_UNAUTHORIZED)

    refresh = RefreshToken.for_user(user)
    AuditLog.objects.create(
        user=user,
        action='login',
        model_name='User',
        object_id=str(user.id),
        description=f'Inicio de sesión con PIN: {user.get_full_name() or user.username}',
    )

    from .serializers import UserSerializer
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
    })


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class UserViewSet(mixins.ListModelMixin,
                  mixins.RetrieveModelMixin,
                  mixins.CreateModelMixin,
                  mixins.UpdateModelMixin,
                  mixins.DestroyModelMixin,
                  viewsets.GenericViewSet):
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ('create',):
            return UserCreateSerializer
        if self.action in ('partial_update', 'update'):
            return UserUpdateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in ('list', 'retrieve', 'me', 'verify_admin_pin'):
            return [permissions.IsAuthenticated()]
        return [permissions.IsAuthenticated(), IsAdminUser()]

    def perform_create(self, serializer):
        user = serializer.save()
        AuditLog.objects.create(
            user=self.request.user,
            action='create',
            model_name='User',
            object_id=str(user.id),
            description=f'Usuario creado: {user.username}',
        )

    def perform_update(self, serializer):
        user = serializer.save()
        AuditLog.objects.create(
            user=self.request.user,
            action='update',
            model_name='User',
            object_id=str(user.id),
            description=f'Usuario actualizado: {user.username}',
        )

    def perform_destroy(self, instance):
        AuditLog.objects.create(
            user=self.request.user,
            action='delete',
            model_name='User',
            object_id=str(instance.id),
            description=f'Usuario eliminado: {instance.username}',
        )
        instance.delete()

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def change_password(self, request):
        user = request.user
        old_password = request.data.get('old_password', '')
        new_password = request.data.get('new_password', '')
        if not user.check_password(old_password):
            return Response({'error': 'Contraseña actual incorrecta'}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 6:
            return Response({'error': 'La nueva contraseña debe tener al menos 6 caracteres'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'status': 'ok', 'message': 'Contraseña actualizada correctamente'})

    @action(detail=True, methods=['post'])
    def admin_reset_password(self, request, pk=None):
        self.check_permissions(request)
        target = self.get_object()
        new_password = request.data.get('new_password', '')
        if len(new_password) < 6:
            return Response({'error': 'La contraseña debe tener al menos 6 caracteres'}, status=status.HTTP_400_BAD_REQUEST)
        target.set_password(new_password)
        target.save(update_fields=['password'])
        AuditLog.objects.create(
            user=request.user,
            action='update',
            model_name='User',
            object_id=str(target.id),
            description=f'Contraseña restablecida por admin: {target.username}',
        )
        return Response({'status': 'ok', 'message': 'Contraseña restablecida correctamente'})

    @action(detail=False, methods=['post'])
    def verify_admin_pin(self, request):
        pin = request.data.get('pin', '')
        if not pin:
            return Response({'valid': False, 'error': 'PIN requerido'})
        admin = User.objects.filter(role='admin', pin=pin, is_active=True).first()
        if admin:
            return Response({'valid': True, 'user': admin.username})
        return Response({'valid': False, 'error': 'PIN incorrecto'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def forgot_password(self, request):
        username = request.data.get('username', '')
        pin = request.data.get('pin', '')
        new_password = request.data.get('new_password', '')
        if not username or not pin:
            return Response({'error': 'Usuario y PIN requeridos'}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 6:
            return Response({'error': 'La nueva contraseña debe tener al menos 6 caracteres'}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(username=username, pin=pin, is_active=True).first()
        if not user:
            return Response({'error': 'Credenciales inválidas. Verifica usuario y PIN.'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'status': 'ok', 'message': 'Contraseña restablecida correctamente'})

    @action(detail=False, methods=['post'], url_path='clock-in')
    def clock_in(self, request):
        from django.utils import timezone
        from .models import EmployeeShift
        
        pin = request.data.get('pin')
        user = request.user
        if pin:
            try:
                user = User.objects.get(pin=pin, is_active=True)
            except User.DoesNotExist:
                return Response({'detail': 'PIN incorrecto'}, status=status.HTTP_401_UNAUTHORIZED)

        active_shift = EmployeeShift.objects.filter(user=user, active=True).first()
        if active_shift:
            return Response({'detail': 'Ya tienes un turno activo.'}, status=status.HTTP_400_BAD_REQUEST)
            
        shift = EmployeeShift.objects.create(user=user, clock_in=timezone.now(), active=True)
        return Response({
            'status': 'clocked_in',
            'user': user.username,
            'clock_in': shift.clock_in,
        })

    @action(detail=False, methods=['post'], url_path='clock-out')
    def clock_out(self, request):
        from django.utils import timezone
        from .models import EmployeeShift
        
        pin = request.data.get('pin')
        user = request.user
        if pin:
            try:
                user = User.objects.get(pin=pin, is_active=True)
            except User.DoesNotExist:
                return Response({'detail': 'PIN incorrecto'}, status=status.HTTP_401_UNAUTHORIZED)

        active_shift = EmployeeShift.objects.filter(user=user, active=True).first()
        if not active_shift:
            return Response({'detail': 'No tienes ningún turno activo.'}, status=status.HTTP_400_BAD_REQUEST)
            
        active_shift.clock_out = timezone.now()
        active_shift.active = False
        active_shift.save(update_fields=['clock_out', 'active'])
        
        return Response({
            'status': 'clocked_out',
            'user': user.username,
            'clock_in': active_shift.clock_in,
            'clock_out': active_shift.clock_out,
        })

    @action(detail=False, methods=['get'], url_path='shift-status')
    def shift_status(self, request):
        from .models import EmployeeShift
        active_shift = EmployeeShift.objects.filter(user=request.user, active=True).first()
        if active_shift:
            return Response({
                'active': True,
                'clock_in': active_shift.clock_in,
            })
        return Response({'active': False})

    @action(detail=False, methods=['post'], url_path='verify-admin-pin')
    def verify_admin_pin(self, request):
        pin = request.data.get('pin', '').strip()
        if not pin:
            return Response({'valid': False, 'detail': 'PIN requerido'}, status=400)
        exists = User.objects.filter(pin=pin, role='admin', is_active=True).exists()
        return Response({'valid': exists})


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['rnc', 'business_name', 'commercial_name', 'phone']


class AuditLogViewSet(mixins.ListModelMixin,
                      mixins.RetrieveModelMixin,
                      viewsets.GenericViewSet):
    queryset = AuditLog.objects.select_related('user').all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    filterset_fields = ['action', 'model_name']
    ordering = ['-created_at']


class EmployeeShiftViewSet(viewsets.ModelViewSet):
    queryset = EmployeeShift.objects.select_related('user').all()
    serializer_class = EmployeeShiftSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['user', 'active']


class PayrollPaymentViewSet(viewsets.ModelViewSet):
    queryset = PayrollPayment.objects.select_related('user').all()
    serializer_class = PayrollPaymentSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]

    @action(detail=False, methods=['get'], url_path='calculate')
    def calculate_payroll(self, request):
        from datetime import datetime
        from django.db.models import Sum
        from apps.billing.models import Payment
        from .models import EmployeeShift, User
        from decimal import Decimal
        
        start_str = request.query_params.get('period_start')
        end_str = request.query_params.get('period_end')
        
        if not start_str or not end_str:
            return Response({'detail': 'period_start y period_end son requeridos (YYYY-MM-DD)'}, status=400)
            
        try:
            start_date = datetime.strptime(start_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'detail': 'Formato de fecha inválido. Usar YYYY-MM-DD'}, status=400)

        # 1. Obtener todos los turnos completados en el rango
        shifts = EmployeeShift.objects.filter(
            clock_in__date__range=[start_date, end_date],
            active=False
        )
        
        user_hours = {}
        total_shift_hours = Decimal('0.0')
        
        for shift in shifts:
            if shift.clock_out:
                duration = shift.clock_out - shift.clock_in
                hours = Decimal(str(duration.total_seconds() / 3600.0))
                user_hours[shift.user_id] = user_hours.get(shift.user_id, Decimal('0.0')) + hours
                total_shift_hours += hours

        # 2. Sumar el total de propinas recolectadas en el periodo
        payments = Payment.objects.filter(created_at__date__range=[start_date, end_date])
        total_tips = payments.aggregate(total=Sum('propina'))['total'] or Decimal('0.00')

        # 3. Procesar cada usuario activo
        payroll_data = []
        users = User.objects.filter(is_active=True)
        
        for user in users:
            # Horas de trabajo y salario
            hours_worked = user_hours.get(user.id, Decimal('0.0'))
            wages = (hours_worked * user.hourly_rate).quantize(Decimal('0.01'))
            
            # Comisión por ventas
            user_payments = payments.filter(order__waiter=user)
            sales_total = user_payments.aggregate(total=Sum('total'))['total'] or Decimal('0.00')
            commissions = (sales_total * (user.commission_pct / Decimal('100.0'))).quantize(Decimal('0.01'))
            
            # Reparto de Propina proporcional
            user_tips = Decimal('0.00')
            if total_shift_hours > 0:
                user_tips = (total_tips * (hours_worked / total_shift_hours)).quantize(Decimal('0.01'))
                
            # Deducciones por consumo interno
            deductions = payments.filter(employee=user, deduct_from_payroll=True).aggregate(total=Sum('total'))['total'] or Decimal('0.00')
            
            net_pay = wages + commissions + user_tips - deductions
            
            payroll_data.append({
                'user': user.id,
                'user_name': user.username,
                'role': user.get_role_display(),
                'hours_worked': float(hours_worked),
                'hourly_rate': float(user.hourly_rate),
                'wages_earned': float(wages),
                'commissions_earned': float(commissions),
                'tips_earned': float(user_tips),
                'deductions': float(deductions),
                'net_pay': float(net_pay),
            })
            
        return Response({
            'period_start': start_str,
            'period_end': end_str,
            'total_tips_collected': float(total_tips),
            'total_hours': float(total_shift_hours),
            'employees': payroll_data
        })


class BusinessConfigViewSet(viewsets.GenericViewSet,
                             mixins.RetrieveModelMixin,
                             mixins.UpdateModelMixin):
    serializer_class = BusinessConfigSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    queryset = BusinessConfig.objects.all()

    def get_object(self):
        return BusinessConfig.get_instance()

    def perform_update(self, serializer):
        serializer.save()


class TaxConfigViewSet(viewsets.GenericViewSet,
                       mixins.RetrieveModelMixin,
                       mixins.UpdateModelMixin):
    serializer_class = TaxConfigSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    queryset = TaxConfig.objects.all()

    def get_object(self):
        return TaxConfig.get_instance()

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)
        AuditLog.objects.create(
            user=self.request.user,
            action='update',
            model_name='TaxConfig',
            description=f'Configuración fiscal actualizada: ITBIS={serializer.validated_data.get("itbis_rate")}%, Propina={serializer.validated_data.get("tip_rate")}%',
        )


from io import StringIO
from django.core.management import call_command


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated, IsAdminUser])
def trigger_backup(request):
    result = StringIO()
    try:
        call_command('backup', stdout=result)
        output = result.getvalue()
        AuditLog.objects.create(
            user=request.user,
            action='create',
            model_name='Backup',
            description=f'Backup manual ejecutado por {request.user.username}',
        )
        return Response({'status': 'ok', 'message': 'Backup completado', 'output': output})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


import subprocess
from django.http import HttpResponse

VOICES = {
    'es-mx': 'es-MX-DaliaNeural',
    'es-es': 'es-ES-ElviraNeural',
    'es-us': 'es-US-ElenaNeural',
    'es-co': 'es-CO-SalomeNeural',
    'es-ar': 'es-AR-ElenaNeural',
}

def _tts_edge(text: str, voice: str) -> tuple[bytes, str]:
    try:
        result = subprocess.run(
            ['edge-tts', '--voice', voice, '--text', text, '--write-media', '/dev/stdout'],
            capture_output=True,
            timeout=15,
        )
        if result.returncode == 0 and result.stdout:
            return result.stdout, 'audio/mpeg'
    except Exception:
        pass
    return b'', ''

def _tts_espeak(text: str) -> tuple[bytes, str]:
    try:
        result = subprocess.run(
            ['espeak-ng', '-v', 'es', '-w', '/dev/stdout', text],
            capture_output=True,
            timeout=10,
        )
        return result.stdout, 'audio/wav'
    except Exception:
        return b'', ''

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def tts(request):
    text = request.query_params.get('text', '')
    if not text:
        return Response({'error': 'text is required'}, status=400)
    text = text[:300]

    voice_key = request.query_params.get('voice', 'es-mx')
    voice = VOICES.get(voice_key, 'es-MX-DaliaNeural')

    audio, content_type = _tts_edge(text, voice)
    if not audio:
        audio, content_type = _tts_espeak(text)
    if not audio:
        return Response({'error': 'TTS failed'}, status=500)

    return HttpResponse(audio, content_type=content_type)
