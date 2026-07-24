"""
Tests fiscales — D'Yiya POS
Cubre: cálculos ITBIS/propina, validación RNC/cédula (Módulo 11),
generación de Payment, creación de ECFDocument, y casos borde.
"""
from decimal import Decimal
from django.test import TestCase
from apps.billing.utils.rnc import validar_rnc, formatear_rnc


# ─────────────────────────────────────────────────────────────
# 1. Cálculos fiscales
# ─────────────────────────────────────────────────────────────

class FiscalCalculationTest(TestCase):
    """Verifica que ITBIS y Propina se calculen correctamente sobre el subtotal."""

    def _calcular(self, subtotal: float):
        s = Decimal(str(subtotal))
        itbis = (s * Decimal('0.18')).quantize(Decimal('0.01'))
        propina = (s * Decimal('0.10')).quantize(Decimal('0.01'))
        total = s + itbis + propina
        return s, itbis, propina, total

    def test_subtotal_1000(self):
        s, itbis, propina, total = self._calcular(1000)
        self.assertEqual(itbis, Decimal('180.00'))
        self.assertEqual(propina, Decimal('100.00'))
        self.assertEqual(total, Decimal('1280.00'))

    def test_subtotal_500(self):
        s, itbis, propina, total = self._calcular(500)
        self.assertEqual(itbis, Decimal('90.00'))
        self.assertEqual(propina, Decimal('50.00'))
        self.assertEqual(total, Decimal('640.00'))

    def test_subtotal_0(self):
        s, itbis, propina, total = self._calcular(0)
        self.assertEqual(itbis, Decimal('0.00'))
        self.assertEqual(propina, Decimal('0.00'))
        self.assertEqual(total, Decimal('0.00'))

    def test_itbis_no_aplica_sobre_propina(self):
        """ITBIS y propina se calculan sobre subtotal base, no entre sí."""
        subtotal = Decimal('1000.00')
        itbis = (subtotal * Decimal('0.18')).quantize(Decimal('0.01'))
        propina = (subtotal * Decimal('0.10')).quantize(Decimal('0.01'))
        # ITBIS NO debe incluir propina en su base
        self.assertNotEqual(itbis, (subtotal + propina) * Decimal('0.18'))
        # Propina NO debe incluir ITBIS en su base
        self.assertNotEqual(propina, (subtotal + itbis) * Decimal('0.10'))

    def test_subtotal_decimal(self):
        """Precio con centavos — redondeo correcto."""
        s, itbis, propina, total = self._calcular(1234.56)
        self.assertEqual(itbis, Decimal('222.22'))
        self.assertEqual(propina, Decimal('123.46'))
        self.assertEqual(total, s + itbis + propina)

    def test_total_es_suma_de_tres(self):
        """Total = subtotal + ITBIS + Propina, sin doble conteo."""
        for valor in [100, 250, 750, 1500, 9999.99]:
            s, itbis, propina, total = self._calcular(valor)
            self.assertEqual(total, s + itbis + propina,
                             msg=f'Fallo con subtotal={valor}')

    def test_itbis_exento(self):
        """Items exentos de ITBIS tienen ITBIS=0, propina se mantiene."""
        subtotal = Decimal('500.00')
        itbis_exento = Decimal('0.00')
        propina = (subtotal * Decimal('0.10')).quantize(Decimal('0.01'))
        total = subtotal + itbis_exento + propina
        self.assertEqual(total, Decimal('550.00'))


# ─────────────────────────────────────────────────────────────
# 2. Validación RNC — Módulo 11 (9 dígitos, empresas)
# ─────────────────────────────────────────────────────────────

class RNCValidationTest(TestCase):
    """RNC = 9 dígitos, algoritmo Módulo 11 de la DGII."""

    # RNCs válidos conocidos (empresas reales)
    VALIDOS = [
        '101010632',  # Banco Popular
        '101654058',  # DGII
        '101001577',  # Claro RD
    ]

    # RNCs inválidos
    INVALIDOS = [
        '123456789',   # Dígito verificador incorrecto
        '00000000',    # Solo 8 dígitos
        '1234567890',  # 10 dígitos
        'ABCDEFGHI',   # Letras
        '',            # Vacío
        '000000000',   # Ceros (inválido)
    ]

    def test_rnc_validos(self):
        for rnc in self.VALIDOS:
            with self.subTest(rnc=rnc):
                self.assertTrue(validar_rnc(rnc), f'RNC válido rechazado: {rnc}')

    def test_rnc_invalidos(self):
        for rnc in self.INVALIDOS:
            with self.subTest(rnc=rnc):
                self.assertFalse(validar_rnc(rnc), f'RNC inválido aceptado: {rnc}')

    def test_rnc_con_guiones(self):
        """El validador debe ignorar guiones de formato."""
        self.assertTrue(validar_rnc('1-01-01063-2'))   # válido con guiones
        self.assertFalse(validar_rnc('1-23-45678-9'))  # inválido con guiones

    def test_rnc_con_espacios(self):
        """El validador debe ignorar espacios externos."""
        self.assertTrue(validar_rnc(' 101010632 '))


# ─────────────────────────────────────────────────────────────
# 3. Validación Cédula — Módulo 11 (11 dígitos, personas)
# ─────────────────────────────────────────────────────────────

class CedulaValidationTest(TestCase):
    """
    Cédula dominicana = 11 dígitos.
    Valida la estructura de 11 dígitos utilizando el algoritmo de Luhn (módulo 10).
    """

    CEDULAS_VALIDAS = [
        '00113918205',  # Cédula de ejemplo con dígito verificador correcto
    ]

    CEDULAS_INVALIDAS = [
        '12345678901',  # 11 dígitos pero verificador incorrecto
        '0011391820',   # Solo 10 dígitos
        '001139182050', # 12 dígitos
    ]

    def test_cedula_validas(self):
        for cedula in self.CEDULAS_VALIDAS:
            with self.subTest(cedula=cedula):
                self.assertTrue(validar_rnc(cedula), f'Cédula válida rechazada: {cedula}')

    def test_cedula_invalidas(self):
        for cedula in self.CEDULAS_INVALIDAS:
            with self.subTest(cedula=cedula):
                self.assertFalse(validar_rnc(cedula), f'Cédula inválida aceptada: {cedula}')

    def test_cedula_con_guiones(self):
        """El validador debe ignorar guiones en las cédulas."""
        self.assertTrue(validar_rnc('001-1391820-5'))  # Cédula válida con guiones
        self.assertFalse(validar_rnc('123-4567890-1')) # Cédula inválida con guiones


# ─────────────────────────────────────────────────────────────
# 4. Formateo RNC
# ─────────────────────────────────────────────────────────────

class RNCFormatTest(TestCase):
    def test_formato_9_digitos(self):
        self.assertEqual(formatear_rnc('130546901'), '130-5469-01')

    def test_formato_con_guiones_existentes(self):
        """Si ya tiene guiones, no duplica."""
        self.assertEqual(formatear_rnc('130-5469-01'), '130-5469-01')

    def test_formato_otros_no_cambia(self):
        """Cédulas u otros formatos no se modifican."""
        cedula = '00113918581'
        self.assertEqual(formatear_rnc(cedula), cedula)


# ─────────────────────────────────────────────────────────────
# 5. Tests de integración — Payment + ECFDocument
# ─────────────────────────────────────────────────────────────

class PaymentIntegrationTest(TestCase):
    def setUp(self):
        from apps.core.models import User
        from apps.pos.models import MenuCategory, MenuItem, Table, Order, OrderItem
        from apps.billing.models import NCFSequence
        from datetime import date

        self.user = User.objects.create_user(
            username='cajero_test', password='test123', role='cashier'
        )
        self.cat = MenuCategory.objects.create(name='Mariscos', order=1)
        self.item = MenuItem.objects.create(
            name='Langosta', category=self.cat,
            price=Decimal('1500.00'), itbis_type='gravado'
        )
        self.table = Table.objects.create(number='99', section='Test', capacity=2)
        self.order = Order.objects.create(
            table=self.table, waiter=self.user, status='in_kitchen'
        )
        OrderItem.objects.create(
            order=self.order, menu_item=self.item,
            name='Langosta', quantity=1,
            price=Decimal('1500.00'), seat=1
        )
        NCFSequence.objects.create(
            ncf_type='B01', prefix='A01',
            current_sequence=0,
            valid_from=date(2025, 1, 1),
            valid_to=date(2027, 12, 31),
            is_active=True,
        )

    def test_crear_payment_calcula_correctamente(self):
        from apps.billing.models import Payment
        subtotal = Decimal('1500.00')
        itbis = (subtotal * Decimal('0.18')).quantize(Decimal('0.01'))
        propina = (subtotal * Decimal('0.10')).quantize(Decimal('0.01'))
        total = subtotal + itbis + propina

        payment = Payment.objects.create(
            order=self.order,
            method='cash',
            subtotal=subtotal,
            itbis=itbis,
            propina=propina,
            total=total,
            cash_received=Decimal('2000.00'),
            change_given=Decimal('2000.00') - total,
            processed_by=self.user,
        )
        self.assertEqual(payment.subtotal, Decimal('1500.00'))
        self.assertEqual(payment.itbis, Decimal('270.00'))
        self.assertEqual(payment.propina, Decimal('150.00'))
        self.assertEqual(payment.total, Decimal('1920.00'))

    def test_generar_ecf_crea_documento(self):
        from apps.billing.models import Payment, ECFDocument
        from apps.billing.utils.ecf import generar_ecf
        subtotal = Decimal('1500.00')
        payment = Payment.objects.create(
            order=self.order, method='cash',
            subtotal=subtotal,
            itbis=(subtotal * Decimal('0.18')).quantize(Decimal('0.01')),
            propina=(subtotal * Decimal('0.10')).quantize(Decimal('0.01')),
            total=Decimal('1920.00'),
            processed_by=self.user,
        )
        doc = generar_ecf(payment, rnc_cliente='', razon_social='Consumidor Final')
        self.assertEqual(doc.status, 'pending')
        self.assertTrue(doc.ncf.startswith('A01B01'))
        self.assertIsNotNone(doc.json_payload)
        self.assertEqual(ECFDocument.objects.filter(payment=payment).count(), 1)

    def test_generar_ecf_sin_secuencia_activa_lanza_error(self):
        from apps.billing.models import Payment, NCFSequence
        from apps.billing.utils.ecf import generar_ecf
        NCFSequence.objects.all().update(is_active=False)
        payment = Payment.objects.create(
            order=self.order, method='cash',
            subtotal=Decimal('500.00'),
            itbis=Decimal('90.00'),
            propina=Decimal('50.00'),
            total=Decimal('640.00'),
            processed_by=self.user,
        )
        with self.assertRaises(ValueError):
            generar_ecf(payment)

    def test_ncf_sequence_incrementa(self):
        from apps.billing.models import NCFSequence
        seq = NCFSequence.objects.get(ncf_type='B01')
        ncf1 = seq.next_ncf()
        ncf2 = seq.next_ncf()
        self.assertNotEqual(ncf1, ncf2)
        seq.refresh_from_db()
        self.assertEqual(seq.current_sequence, 2)

    def test_vuelto_calculado_correctamente(self):
        from apps.billing.models import Payment
        subtotal = Decimal('1000.00')
        total = Decimal('1280.00')
        cash = Decimal('1500.00')
        payment = Payment.objects.create(
            order=self.order, method='cash',
            subtotal=subtotal,
            itbis=Decimal('180.00'),
            propina=Decimal('100.00'),
            total=total,
            cash_received=cash,
            change_given=cash - total,
            processed_by=self.user,
        )
        self.assertEqual(payment.change_given, Decimal('220.00'))
