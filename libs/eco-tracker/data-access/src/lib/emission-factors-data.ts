import type { EmissionFactor } from './models';

/** kg CO₂ emitted per litre of fuel — used to derive co2e/km from vehicle mileage */
export const FUEL_CO2_PER_LITRE: Record<string, number> = {
  'car-petrol':  2.31,
  'car-diesel':  2.68,
  'motorbike':   2.31,
};

export const EMISSION_FACTORS: EmissionFactor[] = [
  // Transport
  { category: 'transport', type: 'car-petrol',  label: 'Car (Petrol)',    unit: 'km', co2ePerUnit: 0.192, icon: 'icon-car' },
  { category: 'transport', type: 'car-diesel',  label: 'Car (Diesel)',    unit: 'km', co2ePerUnit: 0.171, icon: 'icon-car' },
  { category: 'transport', type: 'car-electric', label: 'Car (Electric)', unit: 'km', co2ePerUnit: 0.053, icon: 'icon-car' },
  { category: 'transport', type: 'bus',          label: 'Bus',            unit: 'km', co2ePerUnit: 0.089, icon: 'icon-direction' },
  { category: 'transport', type: 'train',        label: 'Train',          unit: 'km', co2ePerUnit: 0.041, icon: 'icon-direction' },
  { category: 'transport', type: 'metro',        label: 'Metro / Subway', unit: 'km', co2ePerUnit: 0.028, icon: 'icon-direction' },
  { category: 'transport', type: 'flight-short', label: 'Flight (Short)', unit: 'km', co2ePerUnit: 0.255, icon: 'icon-location-pin' },
  { category: 'transport', type: 'flight-long',  label: 'Flight (Long)',  unit: 'km', co2ePerUnit: 0.195, icon: 'icon-location-pin' },
  { category: 'transport', type: 'motorbike',    label: 'Motorbike',      unit: 'km', co2ePerUnit: 0.114, icon: 'icon-rocket' },
  { category: 'transport', type: 'bicycle',      label: 'Bicycle',        unit: 'km', co2ePerUnit: 0.000, icon: 'icon-target' },
  { category: 'transport', type: 'walking',      label: 'Walking',        unit: 'km', co2ePerUnit: 0.000, icon: 'icon-location-arrow' },

  // Food — Conventional
  { category: 'food', type: 'beef-meal',      label: 'Beef Meal',         unit: 'meal', co2ePerUnit: 3.300, icon: 'icon-cup' },
  { category: 'food', type: 'pork-meal',      label: 'Pork Meal',         unit: 'meal', co2ePerUnit: 1.300, icon: 'icon-cup' },
  { category: 'food', type: 'chicken-meal',   label: 'Chicken Meal',      unit: 'meal', co2ePerUnit: 0.690, icon: 'icon-cup' },
  { category: 'food', type: 'fish-meal',      label: 'Fish Meal',         unit: 'meal', co2ePerUnit: 0.490, icon: 'icon-cup' },
  { category: 'food', type: 'vegetarian-meal', label: 'Vegetarian Meal',  unit: 'meal', co2ePerUnit: 0.380, icon: 'icon-cup' },
  { category: 'food', type: 'vegan-meal',     label: 'Vegan Meal',        unit: 'meal', co2ePerUnit: 0.220, icon: 'icon-cup' },
  { category: 'food', type: 'dairy',          label: 'Dairy (per litre)', unit: 'litre', co2ePerUnit: 3.200, icon: 'icon-cup' },
  // Food — Natural
  { category: 'food', type: 'natural-veg-meal',    label: 'Natural Vegetable Meal',   unit: 'meal',  co2ePerUnit: 0.150, icon: 'icon-heart' },
  { category: 'food', type: 'natural-fruit-meal',  label: 'Natural Fruit Meal',       unit: 'meal',  co2ePerUnit: 0.120, icon: 'icon-heart' },
  { category: 'food', type: 'local-seasonal-meal', label: 'Local / Seasonal Meal',    unit: 'meal',  co2ePerUnit: 0.180, icon: 'icon-heart' },
  { category: 'food', type: 'homegrown-meal',      label: 'Home-Grown Produce Meal',  unit: 'meal',  co2ePerUnit: 0.050, icon: 'icon-heart' },
  { category: 'food', type: 'natural-dairy',       label: 'Natural Dairy (per litre)', unit: 'litre', co2ePerUnit: 2.500, icon: 'icon-heart' },
  { category: 'food', type: 'millets-meal',        label: 'Millets / Coarse Grain Meal', unit: 'meal', co2ePerUnit: 0.100, icon: 'icon-heart' },
  // Food — Waste
  { category: 'food', type: 'food-waste',          label: 'Food Waste (Landfill)',    unit: 'kg',    co2ePerUnit: 2.500, icon: 'icon-trash' },
  { category: 'food', type: 'food-waste-compost',  label: 'Food Waste (Composted)',   unit: 'kg',    co2ePerUnit: 0.050, icon: 'icon-trash' },

  // Energy
  { category: 'energy', type: 'electricity',    label: 'Electricity',        unit: 'kWh', co2ePerUnit: 0.233, icon: 'icon-bolt' },
  { category: 'energy', type: 'natural-gas',    label: 'Natural Gas',        unit: 'kWh', co2ePerUnit: 0.203, icon: 'icon-bolt' },
  { category: 'energy', type: 'lpg',            label: 'LPG Cooking Gas',   unit: 'kg',  co2ePerUnit: 2.983, icon: 'icon-bolt' },
  { category: 'energy', type: 'coal',           label: 'Coal',               unit: 'kg',  co2ePerUnit: 2.421, icon: 'icon-bolt' },
  { category: 'energy', type: 'oil-heating',    label: 'Oil Heating',        unit: 'litre', co2ePerUnit: 2.678, icon: 'icon-bolt' },
  { category: 'energy', type: 'solar',          label: 'Solar Power',        unit: 'kWh', co2ePerUnit: 0.041, icon: 'icon-star' },

  // Shopping
  { category: 'shopping', type: 'clothing-new',   label: 'New Clothing Item',     unit: 'item', co2ePerUnit: 7.000, icon: 'icon-bag' },
  { category: 'shopping', type: 'electronics',    label: 'Electronics (phone etc)', unit: 'item', co2ePerUnit: 70.000, icon: 'icon-bag' },
  { category: 'shopping', type: 'furniture',      label: 'Furniture Item',        unit: 'item', co2ePerUnit: 50.000, icon: 'icon-bag' },
  { category: 'shopping', type: 'online-order',   label: 'Online Shopping Order',  unit: 'order', co2ePerUnit: 0.500, icon: 'icon-bag' },
  { category: 'shopping', type: 'streaming',      label: 'Video Streaming',        unit: 'hour',  co2ePerUnit: 0.036, icon: 'icon-bag' },
];
