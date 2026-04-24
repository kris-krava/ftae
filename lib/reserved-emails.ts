// Email domains that are reserved for system / testing use. Real users must
// not be able to claim them, otherwise the dev test-cleanup logic could
// accidentally delete a real account that happened to share the domain.

export const TEST_EMAIL_DOMAIN = 'test.ftae.local';

export const TEST_DOMAIN_MATCH = /@test\.ftae\.local$/i;

const ALL_RESERVED_PATTERNS: RegExp[] = [TEST_DOMAIN_MATCH];

export function isReservedEmail(email: string): boolean {
  return ALL_RESERVED_PATTERNS.some((p) => p.test(email));
}
