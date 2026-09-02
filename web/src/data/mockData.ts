export const profile = {
  name: "Coral",
  email: "you@example.com",
  householdSize: 2,
  location: "London, UK",
  cultures: ["Chinese", "British", "Indian"],
  dietaryNeeds: ["Halal", "No pork"],
  weeklyBudget: 80,
  plan: "Free Account",
};

export const landingFeatures = [
  {
    title: "Save Money",
    description: "Reduce unnecessary food purchases and make the most of your ingredients.",
    icon: "money",
  },
  {
    title: "Eat Healthier",
    description: "Personalized meal planning tailored to your lifestyle.",
    icon: "health",
  },
  {
    title: "Waste Less",
    description: "Track expiry dates and reduce food waste automatically.",
    icon: "waste",
  },
];

export const recommendedMeals = [
  { name: "Chicken Stir Fry", meta: "25 min | 420 kcal", icon: "chicken" },
  { name: "Spinach Omelette", meta: "15 min | 310 kcal", icon: "egg" },
  { name: "Tomato Rice Bowl", meta: "20 min | 380 kcal", icon: "rice" },
];

export const expiringSoon = [
  { name: "Spinach", timeLeft: "1 day left", icon: "spinach", tone: "red" },
  { name: "Milk", timeLeft: "2 days left", icon: "milk", tone: "gold" },
  { name: "Chicken", timeLeft: "2 days left", icon: "chicken", tone: "gold" },
];

export const mealPlan = [
  {
    day: "Monday",
    short: "Mon",
    cost: "£11.40",
    meals: [
      {
        type: "Breakfast",
        cuisine: "Chinese",
        name: "Congee with Ginger and Spring Onion",
        time: "20 min",
        cost: "£2.40",
      },
      {
        type: "Lunch",
        cuisine: "British-Indian",
        name: "Chicken Tikka Wrap",
        time: "15 min",
        cost: "£3.80",
      },
      {
        type: "Dinner",
        cuisine: "Pakistani",
        name: "Lamb Keema Curry and Rice",
        time: "35 min",
        cost: "£5.20",
      },
    ],
  },
  { day: "Tuesday", short: "Tue", cost: "£11.70", meals: [] },
  { day: "Wednesday", short: "Wed", cost: "£10.60", meals: [] },
  { day: "Thursday", short: "Thu", cost: "£8.60", meals: [] },
  { day: "Friday", short: "Fri", cost: "£12.10", meals: [] },
  { day: "Saturday", short: "Sat", cost: "£13.70", meals: [] },
  { day: "Sunday", short: "Sun", cost: "£14.50", meals: [] },
];

export const shoppingCategories = [
  {
    name: "Fresh Produce",
    progress: "0/5",
    total: "£5.15",
    icon: "broccoli",
    items: [
      { name: "Tomatoes", amount: "500g", price: "£1.20" },
      { name: "Spinach", amount: "200g", price: "£0.90" },
      { name: "Broccoli", amount: "1 head", price: "£0.85" },
      { name: "Carrots", amount: "6 pack", price: "£0.70" },
      { name: "Bell Peppers", amount: "3 pack", price: "£1.50" },
    ],
  },
  {
    name: "Protein",
    progress: "0/3",
    total: "£8.50",
    icon: "protein",
    items: [
      { name: "Chicken Breast", amount: "500g", price: "£4.20" },
      { name: "Eggs", amount: "6 units", price: "£1.80" },
      { name: "Tofu", amount: "1 pack", price: "£2.50" },
    ],
  },
  {
    name: "Pantry and Staples",
    progress: "0/4",
    total: "£8.40",
    icon: "jar",
    items: [],
  },
  {
    name: "Dairy and Others",
    progress: "0/2",
    total: "£3.05",
    icon: "milk",
    items: [],
  },
];

export const pantryCategories = [
  {
    name: "Vegetables",
    count: "5 items",
    icon: "broccoli",
    items: [
      { name: "Spinach", amount: "200g", expiresIn: "2 days", tone: "gold" },
      { name: "Broccoli", amount: "1 head", expiresIn: "5 days", tone: "green" },
      { name: "Tomatoes", amount: "4 pack", expiresIn: "4 days", tone: "green" },
      { name: "Bell Peppers", amount: "2 count", expiresIn: "6 days", tone: "green" },
      { name: "Carrots", amount: "6 pack", expiresIn: "8 days", tone: "green" },
    ],
  },
  { name: "Protein", count: "4 items", icon: "protein", items: [] },
  { name: "Grains", count: "3 items", icon: "rice", items: [] },
  { name: "Condiments", count: "8 items", icon: "jar", items: [] },
  { name: "Frozen", count: "2 items", icon: "snow", items: [] },
];

export const detectedIngredients = [
  { name: "Spinach", amount: "200g", confidence: 98, icon: "spinach" },
  { name: "Eggs", amount: "6 units", confidence: 97, icon: "egg" },
  { name: "Chicken Breast", amount: "500g", confidence: 94, icon: "chicken" },
  { name: "Tomatoes", amount: "4 units", confidence: 92, icon: "tomato" },
  { name: "Milk", amount: "1 litre", confidence: 96, icon: "milk" },
  { name: "Rice", amount: "500g", confidence: 93, icon: "rice" },
  { name: "Onion", amount: "3 units", confidence: 91, icon: "onion" },
  { name: "Garlic", amount: "1 bulb", confidence: 89, icon: "garlic" },
  { name: "Bell Pepper", amount: "2 units", confidence: 90, icon: "pepper" },
  { name: "Carrots", amount: "4 pack", confidence: 88, icon: "carrot" },
  { name: "Butter", amount: "250g", confidence: 95, icon: "butter" },
  { name: "Soy Sauce", amount: "300ml", confidence: 87, icon: "sauce" },
  { name: "Lemon", amount: "2 units", confidence: 86, icon: "lemon" },
  { name: "Fresh Coriander", amount: "30g", confidence: 83, icon: "herb" },
];

// The pricing table used to live here with invented figures (£3.99 / £7.99).
// It now lives in lib/plans.ts, and the price ids come from the API, so there
// is one place where a price can be wrong instead of three.

export const iconMap: Record<string, string> = {
  money: "£",
  health: "H",
  waste: "R",
  chicken: "Ch",
  egg: "Eg",
  rice: "Ri",
  spinach: "Sp",
  milk: "Mk",
  broccoli: "Br",
  protein: "Pr",
  jar: "Jr",
  snow: "Sn",
  tomato: "To",
  onion: "On",
  garlic: "Ga",
  pepper: "Pe",
  carrot: "Ca",
  butter: "Bu",
  sauce: "So",
  lemon: "Le",
  herb: "He",
};
