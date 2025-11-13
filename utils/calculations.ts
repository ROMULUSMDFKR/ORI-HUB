import { Unit } from "../types";

const CONVERSION_FACTORS: Record<Unit, number> = {
    ton: 1000,
    kg: 1,
    L: 1, // Assuming L is a base unit for liquids
    unidad: 1, // Base unit
};

/**
 * Converts a price from a source unit to a target unit.
 * For now, it only handles weight conversion between ton and kg.
 * @param price - The price to convert.
 * @param fromUnit - The source unit of the price.
 * @param toUnit - The target unit for the price.
 * @returns The converted price.
 */
export function convertPrice(price: number, fromUnit: Unit, toUnit: Unit): number {
    if (fromUnit === toUnit) {
        return price;
    }

    // Convert 'from' unit price to a base price (per kg)
    const basePrice = price / CONVERSION_FACTORS[fromUnit];
    
    // Convert base price to the 'to' unit price
    const convertedPrice = basePrice * CONVERSION_FACTORS[toUnit];

    return convertedPrice;
}

/**
 * Converts a quantity from a source unit to tons.
 * Assumes 1 ton = 1000 kg and 1 ton = 1000 L for simplicity.
 * @param quantity The quantity to convert.
 * @param fromUnit The source unit of the quantity.
 * @returns The quantity in tons.
 */
export function convertQuantityToTon(quantity: number, fromUnit: Unit): number {
    if (fromUnit === 'ton') {
        return quantity;
    }
    if (fromUnit === 'kg') {
        return quantity / 1000;
    }
    if (fromUnit === 'L') {
        // This is a simplification. Density would be needed for a real app.
        return quantity / 1000;
    }
    // 'unidad' is not convertible in a generic way. Assuming 1 unit is negligible or handled elsewhere.
    return 0; 
}
