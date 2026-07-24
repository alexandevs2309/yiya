"""
Validación de RNC (Registro Nacional del Contribuyente) y Cédula dominicana.

Fuentes:
  - DGII: algoritmo módulo-11 para RNC de 9 dígitos (personas jurídicas).
  - JCE / Resolución 01-2007: algoritmo módulo-10 para cédula de 11 dígitos.
"""


def _validar_rnc_9(digits: list[int]) -> bool:
    """Valida un RNC empresarial de 9 dígitos (módulo 11)."""
    weights = [7, 9, 8, 6, 5, 4, 3, 2]
    suma = sum(d * w for d, w in zip(digits[:8], weights))
    resto = suma % 11
    check = (10 - resto) % 9 + 1
    return check == digits[8]


def _validar_cedula_11(digits: list[int]) -> bool:
    """Valida una cédula dominicana de 11 dígitos (módulo 10 con pesos alternados)."""
    weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2]
    suma = 0
    for d, w in zip(digits[:10], weights):
        product = d * w
        # Si el producto es >= 10, restar 9 (equivalente a sumar los dígitos del producto)
        if product >= 10:
            product -= 9
        suma += product
    check = (10 - (suma % 10)) % 10
    return check == digits[10]


def validar_rnc(rnc: str) -> bool:
    """
    Valida un RNC empresarial (9 dígitos) o cédula dominicana (11 dígitos).

    Acepta guiones (e.g. '1-30-02350-0') que se eliminan antes de validar.
    Retorna True si el número es válido, False en cualquier otro caso.
    """
    if not isinstance(rnc, str):
        return False
    rnc = rnc.replace('-', '').strip()
    if not rnc.isdigit():
        return False
    length = len(rnc)
    digits = [int(d) for d in rnc]
    if length == 9:
        return _validar_rnc_9(digits)
    if length == 11:
        return _validar_cedula_11(digits)
    return False


def formatear_rnc(rnc: str) -> str:
    """Formatea un RNC en el estilo visual estándar XXX-XXXX-XX."""
    rnc = rnc.replace('-', '').strip()
    if len(rnc) == 9:
        return f'{rnc[:3]}-{rnc[3:7]}-{rnc[7:9]}'
    return rnc
