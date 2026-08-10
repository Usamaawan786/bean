export const RECIPE_LOCK_PASSWORD = "Istuser786";

export function verifyRecipePassword(input) {
  return input === RECIPE_LOCK_PASSWORD;
}