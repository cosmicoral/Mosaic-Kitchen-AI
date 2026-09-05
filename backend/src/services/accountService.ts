import bcrypt from 'bcrypt';
import { AppError } from '../types/index.ts';
import * as mealPlanRepository from '../repositories/mealPlanRepository.ts';
import * as pantryRepository from '../repositories/pantryRepository.ts';
import * as profileRepository from '../repositories/profileRepository.ts';
import * as shoppingListRepository from '../repositories/shoppingListRepository.ts';
import * as subscriptionRepository from '../repositories/subscriptionRepository.ts';
import * as identityRepository from '../repositories/identityRepository.ts';
import * as userRepository from '../repositories/userRepository.ts';
import { assertValidPassword } from './authService.ts';
import { stripe } from './stripe.ts';

// Same cost as signup. A password changed here must be no cheaper to crack
// than one set at the door.
const SALT_ROUNDS = 12;

export interface AccountOverview {
  email: string;
  created_at: Date;
  // Whether this account can sign in with a password at all. An account
  // created through Google has no password_hash, and offering it a "change
  // password" form would be asking it to change something it does not have.
  has_password: boolean;
  providers: string[];
}

export async function getOverview(userId: string): Promise<AccountOverview> {
  const user = await userRepository.findWithPasswordById(userId);
  if (!user) throw new AppError('Account not found', 'NOT_FOUND');

  const identities = await identityRepository.listForUser(userId);

  return {
    email: user.email,
    created_at: user.created_at,
    has_password: user.password_hash !== null,
    providers: identities.map((identity) => identity.provider),
  };
}

export async function changePassword(
  userId: string,
  currentPassword: unknown,
  newPassword: unknown
): Promise<void> {
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    throw new AppError('Both passwords are required', 'VALIDATION_ERROR');
  }

  const user = await userRepository.findWithPasswordById(userId);
  if (!user) throw new AppError('Account not found', 'NOT_FOUND');

  // Deliberately not a place to *set* a first password. Adding a password to
  // an account that only had Google is adding a new way in, and anyone holding
  // a stolen session could do it silently. That needs email confirmation,
  // which needs a verified sending domain we do not have yet — so this refuses
  // and says why rather than quietly being a security hole.
  if (user.password_hash === null) {
    throw new AppError(
      'This account signs in with Google, so there is no password to change.',
      // The same code the login route uses when a password sign-in is
      // attempted on an OAuth-only account. One meaning, one code.
      'PASSWORD_LOGIN_UNAVAILABLE'
    );
  }

  const matches = await bcrypt.compare(currentPassword, user.password_hash);
  if (!matches) {
    throw new AppError('Your current password is not correct', 'INVALID_CREDENTIALS');
  }

  if (currentPassword === newPassword) {
    throw new AppError('The new password must be different', 'VALIDATION_ERROR');
  }

  assertValidPassword(newPassword);

  await userRepository.updatePasswordHash(
    userId,
    await bcrypt.hash(newPassword, SALT_ROUNDS)
  );
}

export interface DataExport {
  exported_at: string;
  account: { email: string; created_at: Date };
  profile: unknown;
  pantry_items: unknown[];
  shopping_list: unknown[];
  meal_plans: unknown[];
}

// UK GDPR gives people the right to a copy of their data. This is that copy:
// everything the account owns, in the shape it is stored, with nothing summarised
// away. Passwords and session ids are not in it — those are credentials, not
// personal data the user needs back.
export async function exportData(userId: string): Promise<DataExport> {
  const [user, profile, pantryItems, shoppingList, mealPlans] = await Promise.all([
    userRepository.findById(userId),
    profileRepository.findByUserId(userId),
    pantryRepository.findAllByUser(userId),
    shoppingListRepository.findAllByUser(userId),
    mealPlanRepository.findAllForUser(userId),
  ]);

  if (!user) throw new AppError('Account not found', 'NOT_FOUND');

  return {
    exported_at: new Date().toISOString(),
    account: { email: user.email, created_at: user.created_at },
    profile,
    pantry_items: pantryItems,
    shopping_list: shoppingList,
    meal_plans: mealPlans,
  };
}

// UK GDPR erasure. Irreversible, and there is no soft-delete to walk back from,
// which is why the caller has to pass the account's own email: a mis-click
// cannot produce it, and a click-jacked button cannot either.
export async function deleteAccount(
  userId: string,
  confirmEmail: unknown
): Promise<void> {
  const user = await userRepository.findById(userId);
  if (!user) throw new AppError('Account not found', 'NOT_FOUND');

  if (
    typeof confirmEmail !== 'string' ||
    confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()
  ) {
    throw new AppError(
      'Type your email address exactly to confirm deletion',
      'VALIDATION_ERROR'
    );
  }

  // Stripe first, and on purpose. Deleting the user row cascades the
  // subscription record away, and if that happened first there would be no
  // stored subscription id left to cancel — the row would be gone and the card
  // would keep being charged every month with nobody able to explain why.
  await cancelSubscriptionIfAny(userId);

  await userRepository.deleteById(userId);
}

async function cancelSubscriptionIfAny(userId: string): Promise<void> {
  const subscription = await subscriptionRepository.findActiveByUser(userId);
  if (!subscription?.stripe_subscription_id) return;

  try {
    await stripe().subscriptions.cancel(subscription.stripe_subscription_id);
  } catch (error) {
    // Refusing to delete the account because Stripe is unreachable would hold
    // a legal right hostage to a third party's uptime. Deleting anyway and
    // leaving a live subscription would keep charging someone who no longer
    // has an account. Between the two, the account goes and this is logged
    // loudly enough to be found and cancelled by hand.
    console.error(
      `URGENT: could not cancel Stripe subscription ${subscription.stripe_subscription_id} ` +
        `while deleting user ${userId}. Cancel it manually in the Stripe dashboard.`,
      error
    );
  }
}
