import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { assertLinksOwned } from '../common/ownership';
import type { CreateContactInput, UpdateContactInput } from '@bizznex/shared';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.contact.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async create(userId: string, dto: CreateContactInput) {
    await assertLinksOwned(this.prisma, userId, { companyId: dto.companyId });
    return this.prisma.contact.create({
      data: {
        userId,
        name: dto.name,
        email: dto.email ?? '',
        phone: dto.phone ?? '',
        title: dto.title ?? '',
        companyId: dto.companyId ?? null,
      },
    });
  }

  private async assertOwned(userId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({ where: { id, userId } });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async update(userId: string, id: string, dto: UpdateContactInput) {
    await this.assertOwned(userId, id);
    await assertLinksOwned(this.prisma, userId, { companyId: dto.companyId });
    return this.prisma.contact.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.companyId !== undefined ? { companyId: dto.companyId ?? null } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.assertOwned(userId, id);
    await this.prisma.contact.delete({ where: { id } });
    return { ok: true };
  }
}
