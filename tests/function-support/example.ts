// Example file that uses functions without importing them

import { calculateSum } from './utils';
import { validateEmail } from './utils';
import { formatCurrency } from './utils';
const total = calculateSum(10, 20);
const isValid = validateEmail('test@example.com');
const price = formatCurrency(29.99);

console.log('Total:', total);
console.log('Valid email:', isValid);
console.log('Price:', price);
