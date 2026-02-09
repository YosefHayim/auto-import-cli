// Utility functions to be imported
export function calculateSum(a: number, b: number): number {
  return a + b;
}

export function validateEmail(email: string): boolean {
  return email.includes('@');
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
