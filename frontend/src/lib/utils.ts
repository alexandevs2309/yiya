import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRD(amount: number): string {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function calcITBIS(subtotal: number, rate?: number): number {
  const itbisRate = rate ?? 0.18;
  return Math.round(subtotal * itbisRate * 100) / 100;
}

export function calcTotal(subtotal: number, itbis: number, tip: number = 0): number {
  return Math.round((subtotal + itbis + tip) * 100) / 100;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export function validateRncCedula(value: string): boolean {
  const cleanVal = value.replace(/[- ]/g, "");
  if (!/^\d+$/.test(cleanVal)) return false;

  const len = cleanVal.length;

  if (len === 9) {
    // RNC — Módulo 11 DGII
    const weights = [7, 9, 8, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 8; i++) {
      sum += parseInt(cleanVal[i], 10) * weights[i];
    }
    const remainder = sum % 11;
    let expected = 0;
    if (remainder === 0) expected = 2;
    else if (remainder === 1) expected = 1;
    else expected = 11 - remainder;
    return parseInt(cleanVal[8], 10) === expected;

  } else if (len === 11) {
    // Cédula — Módulo 10 JCE (pesos alternados sobre los 11 dígitos, suma divisible por 10)
    let total = 0;
    for (let i = 0; i < 11; i++) {
      const weight = i % 2 === 0 ? 1 : 2;
      const product = parseInt(cleanVal[i], 10) * weight;
      total += product >= 10 ? Math.floor(product / 10) + (product % 10) : product;
    }
    return total % 10 === 0;
  }

  return false;
}
