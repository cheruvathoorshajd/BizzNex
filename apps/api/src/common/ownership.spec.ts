import { BadRequestException } from '@nestjs/common';
import { assertLinksOwned } from './ownership';

describe('assertLinksOwned', () => {
  const owned = new Set(['mine-contact', 'mine-company', 'mine-deal']);
  // every lookup is scoped by userId, so another user's id simply isn't found
  const find = jest.fn(({ where }: any) => Promise.resolve(where.userId === 'me' && owned.has(where.id) ? { id: where.id } : null));
  const prisma: any = { contact: { findFirst: find }, company: { findFirst: find }, deal: { findFirst: find } };

  afterEach(() => find.mockClear());

  it('accepts links to your own records and skips empty ones', async () => {
    await expect(assertLinksOwned(prisma, 'me', { contactId: 'mine-contact', companyId: null, dealId: undefined })).resolves.toBeUndefined();
    expect(find).toHaveBeenCalledTimes(1);
    expect(find.mock.calls[0][0].where).toEqual({ id: 'mine-contact', userId: 'me' });
  });

  it("rejects another user's records, naming each one", async () => {
    await expect(assertLinksOwned(prisma, 'me', { contactId: 'theirs', companyId: 'mine-company', dealId: 'theirs-too' }))
      .rejects.toThrow(new BadRequestException('Linked contact and deal not found.'));
    await expect(assertLinksOwned(prisma, 'someone-else', { dealId: 'mine-deal' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
